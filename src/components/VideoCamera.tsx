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
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { uploadValuationVideoApi } from '../features/valuation/api/valuation.api';
import { useValuationStore } from '../features/valuation/store/valuation.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VideoCameraProps {
  route?: any;
}

const VideoCamera: React.FC<VideoCameraProps> = ({ route }) => {
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation<any>();
  const { markSideAsUploaded } = useValuationStore();

  const { id, side, vehicleType } = route?.params || {};

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_DURATION = 120; // 2 minutes

  /* ---------- REQUEST PERMISSION ON MOUNT ---------- */
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

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

  /* ---------- UPLOAD TO API (BACKGROUND) ---------- */
  const uploadVideoInBackground = async (videoPath: string) => {
    try {
      console.log('[VideoUpload] Starting video upload:', { videoPath, id });

      // Get TOKENID from AsyncStorage
      const userCreds = await AsyncStorage.getItem('user_credentials');
      const tokenId = userCreds ? JSON.parse(userCreds)?.TOKENID : '';

      if (!tokenId) {
        throw new Error('User token not found. Please login again.');
      }

      // Call API
      const response = await uploadValuationVideoApi(videoPath, id.toString());

      // Check response for errors
      if (response?.ERROR && response.ERROR !== '0') {
        throw new Error(response?.MESSAGE || 'API returned an error');
      }

      console.log('[VideoUpload] Success:', response);
      ToastAndroid.show('Video uploaded successfully!', ToastAndroid.LONG);
    } catch (error: any) {
      console.error('[VideoUpload] Failed:', error);
      ToastAndroid.show(
        error?.message || 'Failed to upload video. Please retry.',
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

      console.log('[VideoCamera] Video recorded:', videoPath);

      // Mark side as uploaded in store (for UI display)
      markSideAsUploaded(side || 'Video', videoPath);

      // Show uploading message
      ToastAndroid.show('Uploading video...', ToastAndroid.SHORT);

      // Navigate back immediately (same as CustomCamera)
      navigation.goBack();

      // Upload in background with proper error handling
      uploadVideoInBackground(videoPath).catch((error: any) => {
        console.error('[VideoCamera] Background upload error:', error);
      });
    } catch (error) {
      console.error('Error handling video:', error);
      ToastAndroid.show(
        'Error processing video. Please try again.',
        ToastAndroid.LONG
      );
    }
  }, [navigation, id, side, markSideAsUploaded]);

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
        isActive={isCameraActive}
        video={true}
        audio={true}
        onError={(error) => {
          console.error('Camera error:', error);
          ToastAndroid.show('Camera error occurred', ToastAndroid.SHORT);
        }}
      />

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
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

      {/* Control buttons */}
      <View style={styles.controlContainer}>
        {isRecording ? (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <Icon name="stop" size={30} color="white" />
            <Text style={styles.stopButtonText}>STOP</Text>
          </TouchableOpacity>
        ) : (
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
