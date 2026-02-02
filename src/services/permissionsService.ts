import { PERMISSIONS, RESULTS, request, check } from 'react-native-permissions';
import { Platform, ToastAndroid } from 'react-native';

/**
 * Request all required permissions at app startup
 * Called after successful login
 * Requests permissions SEQUENTIALLY (one by one) to ensure all dialogs show
 */
export const requestAllPermissions = async () => {
  try {
    const permissions = Platform.select({
      android: [
        PERMISSIONS.ANDROID.CAMERA,
        PERMISSIONS.ANDROID.RECORD_AUDIO,
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
      ],
      ios: [
        PERMISSIONS.IOS.CAMERA,
        PERMISSIONS.IOS.MICROPHONE,
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      ],
    }) || [];

    console.log('[Permissions] Requesting sequentially:', permissions.length, 'permissions');

    // Request permissions SEQUENTIALLY (one by one) instead of in parallel
    const results = [];
    for (let i = 0; i < permissions.length; i++) {
      console.log(`[Permissions] Requesting permission ${i + 1}/${permissions.length}`);
      const result = await request(permissions[i]);
      results.push(result);
      console.log(`[Permissions] Permission ${i + 1} result:`, result);
    }

    console.log('[Permissions] All permissions requested. Results:', results);

    // Check if critical permissions were granted
    const cameraGranted = results[0] === RESULTS.GRANTED;
    const microphoneGranted = results[1] === RESULTS.GRANTED;
    const locationGranted = results[2] === RESULTS.GRANTED || results[3] === RESULTS.GRANTED;

    if (!cameraGranted) {
      ToastAndroid.show('Camera permission required for photo capture', ToastAndroid.LONG);
    }
    if (!microphoneGranted) {
      ToastAndroid.show('Microphone permission required for video recording', ToastAndroid.LONG);
    }
    if (!locationGranted) {
      ToastAndroid.show('Location permission required for geotagging', ToastAndroid.LONG);
    }

    console.log('[Permissions] Final status:', {
      cameraGranted,
      microphoneGranted,
      locationGranted,
    });

    return {
      cameraGranted,
      microphoneGranted,
      locationGranted,
      allGranted: cameraGranted && microphoneGranted && locationGranted,
    };
  } catch (error) {
    console.error('[Permissions] Error requesting permissions:', error);
    return {
      cameraGranted: false,
      microphoneGranted: false,
      locationGranted: false,
      allGranted: false,
    };
  }
};

/**
 * Check if specific permission is granted
 */
export const checkPermission = async (permission: string): Promise<boolean> => {
  try {
    const result = await check(permission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('[Permissions] Error checking permission:', error);
    return false;
  }
};
