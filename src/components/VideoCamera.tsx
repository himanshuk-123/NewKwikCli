import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Orientation from 'react-native-orientation-locker';
import RNFS from 'react-native-fs';
import { useValuationStore } from '../features/valuation/store/valuation.store';
import { getLocationAsync } from '../utils/geolocation';
import { uploadQueueManager } from '../services/uploadQueue.manager';
import { saveVideoLocally } from '../utils/imageHandler';
import { upsertCapturedMedia } from '../database/valuationProgress.db';

interface VideoCameraProps {
  route?: any;
}

const VideoCamera: React.FC<VideoCameraProps> = ({ route }) => {
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation<any>();
  const { markLocalCaptured } = useValuationStore();

  const { id, side, vehicleType } = route?.params || {};

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  // SELECT LOWER RESOLUTION FORMAT (Approx 480p - 720p to keep size small)
  // FIX: Prefer 'yuv' pixel format to avoid black screen issues on some players
  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
    { pixelFormat: 'yuv' },
    { fps: 30 }
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [timer, setTimer] = useState(0);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_DURATION = 60; // 1 minute

  /* ---------- REQUEST PERMISSION ON MOUNT ---------- */
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  /* ---------- LOCK LANDSCAPE ORIENTATION FOR VIDEO ---------- */
  useEffect(() => {
    // Lock to landscape orientation for video recording
    Orientation.lockToLandscape();

    return () => {
      // Explicitly lock back to portrait when navigating away
      Orientation.lockToPortrait();
    };
  }, []);

  /* ---------- CAMERA LIFECYCLE ---------- */
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setIsCameraActive(false);
    });
    return unsubscribe;
  }, [navigation]);

  /* ---------- TIMER EFFECT ---------- */
  useEffect(() => {
    if (isRecording) {
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev + 1;
          if (newTime >= MAX_DURATION) {
            // Stop recording when max duration reached
            if (cameraRef.current) {
              cameraRef.current.stopRecording().catch((error: any) => {
                console.error('Error stopping recording at max duration:', error);
              });
            }
            setIsRecording(false);
            return MAX_DURATION;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  /* ---------- QUEUE VIDEO FOR UPLOAD ---------- */
  const queueVideoForUpload = async (videoPath: string) => {
    try {
      console.log('[UploadQueue] Adding video to queue:', { videoPath, id });

      // FIX: Verify file exists before queuing
      const filePath = videoPath.startsWith('file://') ? videoPath.replace('file://', '') : videoPath;
      const fileExists = await RNFS.exists(filePath);

      if (!fileExists) {
        throw new Error(`Video file was deleted before queuing: ${filePath}`);
      }

      // Get file size to warn user about large videos (Cloudflare limit is 100MB)
      try {
        const fileInfo = await RNFS.stat(filePath);
        const fileSizeMB = fileInfo.size / (1024 * 1024);
        console.log('[VideoCamera] Video file size:', `${fileSizeMB.toFixed(2)}MB`);

        if (fileSizeMB > 100) {
          throw new Error(
            `Video is too large: ${fileSizeMB.toFixed(2)}MB\n\n` +
            `Maximum allowed: 100MB\n` +
            `Please record a shorter video or use lower quality.`
          );
        }

        if (fileSizeMB > 50) {
          ToastAndroid.show(
            `⚠️ Large video (${fileSizeMB.toFixed(1)}MB) - upload may take a while`,
            ToastAndroid.LONG
          );
        }
      } catch (error: any) {
        if (error.message.includes('too large') || error.message.includes('Maximum allowed')) throw error;
        console.warn('[VideoCamera] Could not verify file size:', error?.message);
      }

      // Get geolocation
      const location = await getLocationAsync();
      const geo = {
        lat: location?.lat || '0',
        long: location?.long || '0',
        timeStamp: new Date().toISOString(),
      };

      // Add to upload queue (db manager with SQLite + retry logic)
      const queueId = await uploadQueueManager.addToQueue({
        type: 'video',
        leadId: id.toString(),
        paramName: 'Video1',
        vehicleType: vehicleType || '',
        fileUri: videoPath,
        geo,
      });

      console.log('[UploadQueue] Video queued with ID:', queueId);
      ToastAndroid.show('✓ Video queued for upload', ToastAndroid.SHORT);
    } catch (error: any) {
      console.error('[UploadQueue] Failed to queue video:', error);
      ToastAndroid.show(
        error?.message || 'Failed to queue video. Please retry.',
        ToastAndroid.LONG
      );
    }
  };

  /* ---------- HANDLE VIDEO RECORDED ---------- */
  const handleVideoRecorded = useCallback(async (video: any) => {
    try {
      const videoPath = video?.path || '';
      if (!videoPath) {
        throw new Error('No video path provided');
      }

      console.log('[VideoCamera] Video recorded (temporary path):', videoPath);

      // Turn off torch after recording
      setIsTorchOn(false);

      // 1️⃣ Save video to persistent storage (CRITICAL - vision-camera uses temp storage)
      const savedVideoUri = await saveVideoLocally(videoPath, id);
      if (!savedVideoUri) {
        throw new Error('Failed to save video to persistent storage');
      }

      console.log('[VideoCamera] Video saved to persistent storage:', savedVideoUri);

      // 2️⃣ Update UI immediately with saved video (LOCAL truth)
      markLocalCaptured(side || 'Video', savedVideoUri);

      // 2.1️⃣ Persist local video URI for restore on revisit
      await upsertCapturedMedia(id.toString(), side || 'Video', savedVideoUri);

      // 3️⃣ Queue for background upload (works online or offline)
      await queueVideoForUpload(savedVideoUri);

      // Lock to portrait before navigating back
      Orientation.lockToPortrait();

      // Navigate back immediately
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('Error handling video:', error);
      ToastAndroid.show(
        'Error processing video. Please try again.',
        ToastAndroid.LONG
      );
    }
  }, [navigation, id, side, markLocalCaptured, queueVideoForUpload]);

  const stopRecording = useCallback(async () => {
    try {
      if (cameraRef.current) {
        await cameraRef.current.stopRecording();
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) {
      ToastAndroid.show('Camera not ready', ToastAndroid.SHORT);
      return;
    }

    try {
      setIsRecording(true);
      await cameraRef.current.startRecording({
        flash: 'off', // Don't use flash for recording, use torch instead
        fileType: 'mp4', // Explicitly use MP4 container
        videoCodec: 'h264',
        // Note: bitrate is controlled by format on <Camera> in v3/v4
        onRecordingFinished: (video: any) => {
          handleVideoRecorded(video);
        },
        onRecordingError: (error: any) => {
          console.error('Recording error:', error);
          setIsRecording(false);
          ToastAndroid.show('Recording error', ToastAndroid.SHORT);
        },
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      ToastAndroid.show('Failed to start recording', ToastAndroid.SHORT);
    }
  }, [handleVideoRecorded]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        format={format} // Apply 480p format
        isActive={isCameraActive}
        video={true}
        audio={true}
        torch={isTorchOn ? 'on' : 'off'}
        videoStabilizationMode="standard"
        videoHdr={false}
        lowLightBoost={false}
        onError={(error) => {
          console.error('Camera error:', error);
          ToastAndroid.show('Camera error occurred', ToastAndroid.SHORT);
        }}
      />

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          Orientation.lockToPortrait();
          navigation.goBack();
        }}
      >
        <Icon name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Timer display */}
      {isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timer}s / {MAX_DURATION}s
          </Text>
        </View>
      )}

      {/* Flash/Torch button */}
      <TouchableOpacity
        style={[styles.flashButton, isTorchOn && styles.flashButtonActive]}
        onPress={() => {
          setIsTorchOn(!isTorchOn);
          ToastAndroid.show(
            !isTorchOn ? 'Flashlight ON' : 'Flashlight OFF',
            ToastAndroid.SHORT
          );
        }}
      >
        <Icon name={isTorchOn ? 'flash-on' : 'flash-off'} size={24} color="#fff" />
      </TouchableOpacity>

      {/* Control buttons */}
      <View style={styles.controlContainer}>
        {!isRecording && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
          >
            <View style={styles.recordButtonCircle}>
              <View style={styles.recordButtonInner} />
            </View>
            <Text style={styles.recordButtonText}>Record</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default VideoCamera;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  flashButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  flashButtonActive: {
    backgroundColor: 'rgba(255,200,0,0.8)',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,68,68,0.9)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4444',
  },
  recordButtonText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#1181B2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VideoCamera;
