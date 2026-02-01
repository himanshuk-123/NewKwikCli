/**
 * Geolocation Utility
 * Handles getting device location for image upload metadata
 */

import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationCoords {
  lat: string;
  long: string;
  timeStamp?: string;
}

/**
 * Request location permission (Android only)
 */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles this differently
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'KwikCheck needs access to your location for image metadata.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Location permission error:', err);
    return false;
  }
};

/**
 * Get current device location
 * Falls back to (0, 0) if location unavailable
 */
export const getLocationAsync = async (): Promise<LocationCoords> => {
  try {
    // Request permission first
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      console.warn('[Location] Permission denied, using fallback (0,0)');
      return {
        lat: '0',
        long: '0',
        timeStamp: new Date().toISOString(),
      };
    }

    // Get current position
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('[Location] Success:', {
            lat: position.coords.latitude,
            long: position.coords.longitude,
          });

          resolve({
            lat: position.coords.latitude.toString(),
            long: position.coords.longitude.toString(),
            timeStamp: new Date().toISOString(),
          });
        },
        (error) => {
          console.warn('[Location] Error:', error.message);
          // Fallback on error
          resolve({
            lat: '0',
            long: '0',
            timeStamp: new Date().toISOString(),
          });
        },
        {
          enableHighAccuracy: false, // Faster, less accurate
          timeout: 5000,
          maximumAge: 10000, // Cache location for 10 seconds
        }
      );
    });
  } catch (error) {
    console.error('[Location] Unexpected error:', error);
    return {
      lat: '0',
      long: '0',
      timeStamp: new Date().toISOString(),
    };
  }
};
