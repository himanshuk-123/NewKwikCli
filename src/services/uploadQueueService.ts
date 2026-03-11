import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { uploadValuationImageApi, uploadValuationVideoApi } from '../features/valuation/api/valuation.api';
import { ToastAndroid } from 'react-native';
import RNFS from 'react-native-fs';

// ============ TYPES ============
export interface UploadQueueItem {
  id: string; // Unique ID (timestamp + random)
  type: 'image' | 'video';
  leadId: string;
  vehicleTypeValue: string;
  paramName: string;
  fileUri: string; // Local file path - base64 read on-demand to save storage
  geolocation: { lat: string; long: string; timeStamp: string };
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

// ============ CONSTANTS ============
const QUEUE_STORAGE_KEY = '@upload_queue';
const MAX_RETRY_COUNT = 5;
const RETRY_DELAYS = [1000, 3000, 5000, 10000, 30000]; // Exponential backoff
const MAX_CONCURRENT_UPLOADS = 2;

// ============ QUEUE MANAGER CLASS ============
class UploadQueueManager {
  private queue: UploadQueueItem[] = [];
  private isProcessing = false;
  private activeUploads = 0;
  private listeners: Array<(queue: UploadQueueItem[]) => void> = [];

  private initialized = false;

  constructor() {
    // Lazy initialization to avoid blocking on import
    setTimeout(() => this.initialize(), 0);
  }

  // Initialize: Load queue from storage and start network listener
  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await this.loadQueueFromStorage();
      this.startNetworkListener();
      this.processQueue(); // Start processing immediately
    } catch (error) {
      console.error('[UploadQueue] Initialization failed:', error);
    }
  }

  // Load queue from AsyncStorage
  private async loadQueueFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log('[UploadQueue] Loaded from storage:', this.queue.length, 'items');
      }
    } catch (error) {
      console.error('[UploadQueue] Failed to load from storage:', error);
    }
  }

  // Save queue to AsyncStorage
  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[UploadQueue] Failed to save to storage:', error);
    }
  }

  // Read base64 from file URI on-demand (saves AsyncStorage space)
  private async readBase64FromFile(fileUri: string): Promise<string> {
    try {
      const filePath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
      const base64 = await RNFS.readFile(filePath, 'base64');
      console.log('[UploadQueue] Read base64 from file, length:', base64.length);
      return base64;
    } catch (error) {
      console.error('[UploadQueue] Failed to read base64:', error);
      throw new Error('Failed to read image file');
    }
  }

  // Add item to queue (base64 NOT stored - read on-demand to save storage)
  async addToQueue(item: Omit<UploadQueueItem, 'id' | 'retryCount' | 'status' | 'createdAt'>): Promise<string> {
    // Ensure initialized before adding
    if (!this.initialized) {
      await this.initialize();
    }

    const queueItem: UploadQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.push(queueItem);
    await this.saveQueueToStorage();
    this.notifyListeners();

    console.log('[UploadQueue] Added item:', queueItem.id, queueItem.paramName);

    // Start processing if not already running
    this.processQueue();

    return queueItem.id;
  }

  // Process queue
  private async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeUploads < MAX_CONCURRENT_UPLOADS) {
      // Find next pending or failed item
      const nextItem = this.queue.find(
        item => (item.status === 'pending' || item.status === 'failed') && item.retryCount < MAX_RETRY_COUNT
      );

      if (!nextItem) break;

      // Check network connectivity
      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          console.log('[UploadQueue] No internet connection, pausing queue');
          break;
        }
      } catch (error) {
        console.warn('[UploadQueue] Cannot check network status, proceeding anyway');
        // Proceed with upload - let the API call itself handle network errors
      }

      // Process item
      this.activeUploads++;
      this.processItem(nextItem);
    }

    this.isProcessing = false;
  }

  // Process single item
  private async processItem(item: UploadQueueItem) {
    // Update status to uploading
    item.status = 'uploading';
    item.lastAttemptAt = Date.now();
    await this.saveQueueToStorage();
    this.notifyListeners();

    console.log('[UploadQueue] Processing:', item.id, item.paramName, `(Attempt ${item.retryCount + 1})`);

    try {
      // Upload based on type
      if (item.type === 'image') {
        // Read base64 on-demand to save AsyncStorage space
        const base64String = await this.readBase64FromFile(item.fileUri);
        await uploadValuationImageApi(
          base64String,
          item.paramName,
          item.leadId,
          item.vehicleTypeValue,
          item.geolocation
        );
      } else if (item.type === 'video') {
        await uploadValuationVideoApi(
          item.fileUri,
          item.leadId
        );
      }

      // Success: Remove from queue
      console.log('[UploadQueue] Success:', item.id);
      this.queue = this.queue.filter(q => q.id !== item.id);
      await this.saveQueueToStorage();
      this.notifyListeners();

      ToastAndroid.show(`✓ ${item.paramName} uploaded`, ToastAndroid.SHORT);

    } catch (error: any) {
      // Failure: Update retry count
      console.error('[UploadQueue] Failed:', item.id, error?.message);
      item.status = 'failed';
      item.retryCount++;
      item.error = error?.message || 'Unknown error';

      if (item.retryCount >= MAX_RETRY_COUNT) {
        console.log('[UploadQueue] Max retries reached:', item.id);
        ToastAndroid.show(`✗ ${item.paramName} failed after ${MAX_RETRY_COUNT} attempts`, ToastAndroid.LONG);
      } else {
        // Schedule retry
        const delay = RETRY_DELAYS[item.retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log('[UploadQueue] Retrying in', delay / 1000, 'seconds');
        setTimeout(() => this.processQueue(), delay);
      }

      await this.saveQueueToStorage();
      this.notifyListeners();
    } finally {
      this.activeUploads--;
      this.processQueue(); // Continue processing next item
    }
  }

  // Start network listener to resume queue when connection returns
  private startNetworkListener() {
    try {
      NetInfo.addEventListener(state => {
        if (state.isConnected) {
          console.log('[UploadQueue] Network connected, resuming queue');
          this.processQueue();
        }
      });
    } catch (error) {
      console.warn('[UploadQueue] Failed to setup network listener:', error);
      // Continue without network monitoring - uploads will still work
    }
  }

  // Subscribe to queue changes
  subscribe(listener: (queue: UploadQueueItem[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  // Get queue status
  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      uploading: this.queue.filter(i => i.status === 'uploading').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      queue: [...this.queue],
    };
  }

  // Clear completed items
  async clearCompleted() {
    this.queue = this.queue.filter(i => i.status !== 'completed');
    await this.saveQueueToStorage();
    this.notifyListeners();
  }

  // Retry failed items
  async retryFailed() {
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
        item.error = undefined;
      }
    });
    await this.saveQueueToStorage();
    this.notifyListeners();
    this.processQueue();
  }

  // Clear all items
  async clearAll() {
    this.queue = [];
    await this.saveQueueToStorage();
    this.notifyListeners();
  }
}

// ============ SINGLETON INSTANCE ============
export const uploadQueueManager = new UploadQueueManager();
