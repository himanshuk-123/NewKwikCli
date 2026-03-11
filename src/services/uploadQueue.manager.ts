import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import { ToastAndroid } from 'react-native';
import {
  initUploadQueueDB,
  insertQueueItem,
  getPendingQueueItems,
  updateQueueStatus,
  deleteQueueItem,
  getQueueCount,
  UploadQueueDBItem,
  getAllQueueItems,
  resetFailedPermanentItems,
  markItemAsOrphaned,
  getQueueItemByFileUri,
} from '../database/uploadQueue.db';
import {
  initValuationProgressDB,
  initializeLeadProgress,
  incrementUploadedCount,
  markMediaAsUploaded,
} from '../database/valuationProgress.db';
import {
  uploadValuationImageMultipart,
  uploadValuationImageApi,
  uploadValuationVideoApi,
} from '../features/valuation/api/valuation.api';

/* ===================== CONFIG ===================== */

const MAX_CONCURRENT_UPLOADS = 2;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAYS = [1000, 3000, 5000, 10000, 30000];

/* ===================== MANAGER ===================== */

class UploadQueueManager {
  private activeUploads = 0;
  private isRunning = false;
  private listeners: Array<(count: number) => void> = [];
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    await initUploadQueueDB();
    await initValuationProgressDB();
    this.startNetworkListener();
    this.processQueue();
  }

  private async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /* ===================== PUBLIC API ===================== */

  async addToQueue(item: {
    type: 'image' | 'video';
    fileUri: string;
    leadId: string;
    paramName: string;
    vehicleType: string;
    geo: { lat: string; long: string; timeStamp: string };
  }) {
    await this.ensureInitialized();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[UploadQueue] [ADD_TO_QUEUE] Adding ${item.type} to queue:`, {
      id,
      type: item.type,
      leadId: item.leadId,
      paramName: item.paramName,
      fileUri: item.fileUri,
    });

    try {
      await insertQueueItem({
        id,
        type: item.type,
        fileUri: item.fileUri,
        leadId: item.leadId,
        paramName: item.paramName,
        vehicleType: item.vehicleType,
        geoLat: item.geo.lat,
        geoLong: item.geo.long,
        geoTime: item.geo.timeStamp,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
      });

      console.log(`[UploadQueue] [ADD_TO_QUEUE_SUCCESS] Item inserted with ID: ${id}`);
      
      // Track progress for this lead
      try {
        await initializeLeadProgress(item.leadId);
        console.log(`[UploadQueue] [PROGRESS_UPDATED] Lead initialized: ${item.leadId}`);
      } catch (progressError) {
        console.error(`[UploadQueue] [PROGRESS_ERROR] Failed to update progress:`, progressError);
      }
    } catch (error: any) {
      console.error(`[UploadQueue] [ADD_TO_QUEUE_ERROR] Failed to insert item:`, error?.message || error);
      throw error;
    }

    this.notify();
    this.processQueue();

    return id;
  }

  subscribe(listener: (count: number) => void) {
    this.listeners.push(listener);
    this.ensureInitialized().then(() => this.notify());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async getQueueCount() {
    await this.ensureInitialized();
    return getQueueCount();
  }

  /**
   * Discover files that weren't properly queued due to cache clear or app crash
   * This happens when:
   * 1. User records video/image
   * 2. App is closed or cache is cleared before upload
   * 3. Database is wiped but files in /files/ persist
   * 4. App restarts with orphaned files but no queue entries
   */
  private async discoverOrphanedFiles() {
    console.log('[UploadQueue] [DISCOVERY] Scanning for orphaned files...');
    await this.ensureInitialized();
    
    const videoDir = `${RNFS.DocumentDirectoryPath}/valuation_videos`;
    const imageDir = `${RNFS.DocumentDirectoryPath}/valuation_images`;
    let discoveredCount = 0;

    try {
      // Scan video directory
      const videoDirExists = await RNFS.exists(videoDir);
      if (videoDirExists) {
        const videoFiles = await RNFS.readDir(videoDir);
        console.log(`[UploadQueue] [DISCOVERY] Found ${videoFiles.length} video files`);
        
        for (const file of videoFiles) {
          if (file.isFile && file.name.endsWith('.mp4')) {
            const fileUri = `file://${file.path}`;
            
            // Check if already queued
            const existingEntry = await getQueueItemByFileUri(fileUri);
            if (!existingEntry) {
              // Extract leadId from filename: {leadId}_Video_{timestamp}.mp4
              const match = file.name.match(/^(\d+)_Video_\d+\.mp4$/);
              if (match) {
                const leadId = match[1];
                console.log(`[UploadQueue] [DISCOVERY] Re-queuing orphaned video: ${file.name} (leadId: ${leadId})`);
                
                // Re-queue with generic Video1 paramName
                try {
                  await this.addToQueue({
                    type: 'video',
                    fileUri,
                    leadId,
                    paramName: 'Video1',
                    vehicleType: '',
                    geo: {
                      lat: '0',
                      long: '0',
                      timeStamp: new Date().toISOString(),
                    },
                  });
                  discoveredCount++;
                } catch (err) {
                  console.error(`[UploadQueue] [DISCOVERY] Failed to re-queue video ${file.name}:`, err);
                }
              }
            }
          }
        }
      }

      // Scan image directory  
      const imageDirExists = await RNFS.exists(imageDir);
      if (imageDirExists) {
        const imageFiles = await RNFS.readDir(imageDir);
        console.log(`[UploadQueue] [DISCOVERY] Found ${imageFiles.length} image files`);
        
        for (const file of imageFiles) {
          if (file.isFile && file.name.endsWith('.jpg')) {
            const fileUri = `file://${file.path}`;
            
            // Check if already queued
            const existingEntry = await getQueueItemByFileUri(fileUri);
            if (!existingEntry) {
              // Extract leadId and side from filename: {leadId}_{side}_{timestamp}.jpg
              const match = file.name.match(/^(\d+)_(.+)_\d+\.jpg$/);
              if (match) {
                const leadId = match[1];
                const sideName = match[2].replace(/_/g, ' '); // Convert underscores back to spaces
                
                console.log(`[UploadQueue] [DISCOVERY] Re-queuing orphaned image: ${file.name} (leadId: ${leadId}, side: ${sideName})`);
                
                // Re-queue with side name as paramName (will be appended with Base64 during upload)
                try {
                  await this.addToQueue({
                    type: 'image',
                    fileUri,
                    leadId,
                    paramName: `${sideName}Base64`, // Match the format used in CustomCamera
                    vehicleType: '',
                    geo: {
                      lat: '0',
                      long: '0',
                      timeStamp: new Date().toISOString(),
                    },
                  });
                  discoveredCount++;
                } catch (err) {
                  console.error(`[UploadQueue] [DISCOVERY] Failed to re-queue image ${file.name}:`, err);
                }
              }
            }
          }
        }
      }

      if (discoveredCount > 0) {
        console.log(`[UploadQueue] [DISCOVERY] ✅ Re-queued ${discoveredCount} orphaned files for upload`);
      } else {
        console.log(`[UploadQueue] [DISCOVERY] No orphaned files found`);
      }
    } catch (error: any) {
      console.error('[UploadQueue] [DISCOVERY] Error scanning for orphaned files:', error?.message || error);
    }
  }

  /**
   * Explicitly resume pending uploads on app startup
   * Call this when the app initializes to process any queued items
   * that were interrupted due to app closure or network issues
   */
  async resumeUploads() {
    console.log('[UploadQueue] Resuming pending uploads on app startup...');
    await this.ensureInitialized();
    
    try {
      // First, discover any orphaned files from cache clears
      await this.discoverOrphanedFiles();
      
      // Then, check for any failed_permanent items and reset them
      const allItems = await getAllQueueItems();
      const failedPermanentCount = allItems?.filter(item => item.status === 'failed_permanent').length || 0;
      
      if (failedPermanentCount > 0) {
        console.log(`[UploadQueue] [RESUME] Found ${failedPermanentCount} failed_permanent items, resetting for retry...`);
        const resetCount = await resetFailedPermanentItems();
        console.log(`[UploadQueue] [RESUME] Reset ${resetCount} items to pending status`);
      }
      
      // Now get pending and failed items to process
      const pendingItems = await getPendingQueueItems();
      console.log(`[UploadQueue] [RESUME] Found ${pendingItems.length} pending/failed items`);
      
      if (pendingItems.length > 0) {
        console.log(`[UploadQueue] [RESUME] Items to process:`, pendingItems.map(item => ({
          id: item.id,
          type: item.type,
          leadId: item.leadId,
          status: item.status,
          retryCount: item.retryCount,
        })));
        
        console.log(`[UploadQueue] [RESUME] Starting queue processing...`);
        // Process immediately without waiting for network listener
        await this.processQueue();
      } else {
        console.log('[UploadQueue] [RESUME] No pending/failed uploads to process');
      }
    } catch (error: any) {
      console.error('[UploadQueue] [RESUME_ERROR] Error resuming uploads:', error?.message || error);
    }
  }

  /* ===================== CORE WORKER ===================== */

  private async processQueue() {
    if (this.isRunning) {
      console.log('[UploadQueue] Already processing, skipping...');
      return;
    }
    this.isRunning = true;

    try {
      const net = await NetInfo.fetch();
      console.log('[UploadQueue] Network status:', { isConnected: net.isConnected, type: net.type });
      
      if (!net.isConnected) {
        console.log('[UploadQueue] Device offline, skipping upload processing');
        return;
      }

      const items = await getPendingQueueItems();
      console.log(`[UploadQueue] Processing queue: ${items.length} pending items`);

      // Process items sequentially to avoid overwhelming network
      for (const item of items) {
        if (this.activeUploads >= MAX_CONCURRENT_UPLOADS) {
          console.log(`[UploadQueue] Max concurrent uploads (${MAX_CONCURRENT_UPLOADS}) reached, waiting...`);
          break;
        }
        
        console.log(`[UploadQueue] Starting upload for item: ${item.id} (${item.type})`);
        await this.handleItem(item);
      }
    } catch (error: any) {
      console.error('[UploadQueue] processQueue error:', error?.message || error);
    } finally {
      this.isRunning = false;
      console.log('[UploadQueue] Queue processing completed');
    }
  }

  private async handleItem(item: UploadQueueDBItem) {
    this.activeUploads++;
    console.log(`[UploadQueue] [HANDLE_ITEM_START] Processing ${item.type} item: ${item.id}`);

    try {
      // Check if file still exists BEFORE setting status to uploading
      const normalizedPath = item.fileUri.startsWith('file://')
        ? item.fileUri.replace('file://', '')
        : item.fileUri;
      
      console.log(`[UploadQueue] Checking file exists: ${normalizedPath}`);
      const fileExists = await RNFS.exists(normalizedPath);
      if (!fileExists) {
        console.log(
          `[UploadQueue] [ORPHANED_FILE] File deleted/moved: ${normalizedPath}. ` +
          `This happens if app cache was cleared. Item will not be retried.`
        );
        // Mark as permanently failed without retrying (file cannot be recovered)
        await markItemAsOrphaned(item.id);
        await deleteQueueItem(item.id);
        return; // Exit early, don't try to upload
      }
      console.log(`[UploadQueue] File exists: ${fileExists}`);

      await updateQueueStatus(item.id, 'uploading');


      // CRITICAL FIX 4: Verify network is available before starting upload, especially for videos
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error('Device is offline. Upload will retry when connection is restored.');
      }

      if (item.type === 'image') {
        // Read image as base64 (matching production app)
        console.log('[UploadQueue] Reading image as base64:', normalizedPath);
        const base64String = await RNFS.readFile(normalizedPath, 'base64');
        
        console.log('[UploadQueue] Uploading image:', {
          paramName: item.paramName,
          leadId: item.leadId,
          vehicleType: item.vehicleType,
          base64Length: base64String.length,
          geoLat: item.geoLat,
          geoLong: item.geoLong,
        });

        // Use base64 API (matching production app)
        const response = await uploadValuationImageApi(
          base64String,
          item.paramName,
          item.leadId,
          item.vehicleType,
          {
            lat: item.geoLat,
            long: item.geoLong,
            timeStamp: item.geoTime,
          }
        );
        
        console.log('[UploadQueue] Upload response:', response);
      } else {
        // VIDEO UPLOAD - Large files, more prone to network errors
        console.log('[UploadQueue] Uploading video:', {
          fileUri: item.fileUri,
          leadId: item.leadId,
          paramName: item.paramName,
          networkType: netState.type,
          isConnected: netState.isConnected,
        });

        const videoResponse = await uploadValuationVideoApi(item.fileUri, item.leadId);
        
        console.log('[UploadQueue] Video upload response:', videoResponse);
        
        if (!videoResponse || (videoResponse.ERROR && videoResponse.ERROR !== '0')) {
          throw new Error(videoResponse?.MESSAGE || 'Video upload failed');
        }
      }

      // SUCCESS
      await deleteQueueItem(item.id);
      await this.safeDeleteFile(item.fileUri);
      
      // Track progress for this lead
      try {
        await incrementUploadedCount(item.leadId);
        console.log(`[UploadQueue] [PROGRESS_UPDATED] Uploaded count incremented for lead: ${item.leadId}`);
        
        // Mark the specific side as uploaded in database (survives cache clear)
        // Extract side name from paramName: "OdometerBase64" -> "Odometer", "Video1" -> "Video"
        let sideName = item.paramName;
        if (sideName.endsWith('Base64')) {
          sideName = sideName.slice(0, -6); // Remove "Base64" suffix
        } else if (sideName === 'Video1') {
          sideName = 'Video';
        }
        
        await markMediaAsUploaded(item.leadId, sideName);
        console.log(`[UploadQueue] [SIDE_UPLOADED] Marked ${sideName} as uploaded for lead ${item.leadId}`);
      } catch (progressError) {
        console.error(`[UploadQueue] [PROGRESS_ERROR] Failed to update progress:`, progressError);
      }

      console.log(`[UploadQueue] [HANDLE_ITEM_SUCCESS] ${item.type} item uploaded and removed from queue: ${item.id}`);
      ToastAndroid.show('✓ Upload successful', ToastAndroid.SHORT);
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                             errorMessage.toLowerCase().includes('timeout') ||
                             errorMessage.toLowerCase().includes('enotfound') ||
                             errorMessage.toLowerCase().includes('offline');
      
      console.error(`[UploadQueue] [HANDLE_ITEM_ERROR] Failed to upload ${item.type} item: ${item.id}`, {
        errorMessage,
        isNetworkError,
        itemType: item.type,
        itemLeadId: item.leadId,
        paramName: item.paramName,
        retryCount: item.retryCount,
        fileUri: item.fileUri,
      });

      const retry = item.retryCount + 1;

      if (retry >= MAX_RETRY_COUNT) {
        await updateQueueStatus(item.id, 'failed_permanent', retry);
        console.error(`[UploadQueue] [MAX_RETRIES_REACHED] Item ${item.id} failed after ${MAX_RETRY_COUNT} attempts`);
        ToastAndroid.show(
          `✗ Upload failed after ${MAX_RETRY_COUNT} tries: ${errorMessage}`,
          ToastAndroid.LONG
        );
      } else {
        await updateQueueStatus(item.id, 'failed', retry);
        const delay = RETRY_DELAYS[retry - 1] || 30000;
        console.log(`[UploadQueue] [RETRY_SCHEDULED] Item ${item.id} scheduled for retry in ${delay}ms (attempt ${retry}/${MAX_RETRY_COUNT})`);
        setTimeout(() => this.processQueue(), delay);
      }
    } finally {
      this.activeUploads--;
      this.notify();
      // Don't call processQueue here - let the next network event or retry timer trigger it
      console.log(`[UploadQueue] [HANDLE_ITEM_FINALLY] Completed handling ${item.id}, active uploads: ${this.activeUploads}`);
    }
  }

  /* ===================== HELPERS ===================== */

  private async safeDeleteFile(uri: string) {
    try {
      const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const exists = await RNFS.exists(path);
      if (exists) await RNFS.unlink(path);
    } catch {
      // silent fail – file cleanup best effort
    }
  }

  private startNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processQueue();
      }
    });
  }

  private async notify() {
    try {
      await this.ensureInitialized();
      const count = await getQueueCount();
      this.listeners.forEach(l => l(count));
    } catch (error) {
      console.error('[UploadQueue] notify error:', error);
    }
  }
}

/* ===================== SINGLETON ===================== */

export const uploadQueueManager = new UploadQueueManager();
