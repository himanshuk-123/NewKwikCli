import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

/**
 * Save captured image to local storage (mimics Expo's HandleSaveImage)
 * @param uri - Image URI from camera
 * @param leadId - Lead/Vehicle ID
 * @param side - Which side of vehicle (e.g., "Odometer", "Dashboard")
 * @returns Path to saved image
 */
export const saveImageLocally = async (
  uri: string,
  leadId: string,
  side: string
): Promise<string | null> => {
  try {
    // Create a unique filename
    const timestamp = new Date().getTime();
    const filename = `${leadId}_${side.replace(/\s/g, '_')}_${timestamp}.jpg`;
    
    // Determine save path (platform-specific)
    let savePath: string;
    if (Platform.OS === 'android') {
      // Use app's cache directory on Android
      savePath = `${RNFS.CachesDirectoryPath}/valuation_images/${filename}`;
    } else {
      // Use app's documents directory on iOS
      savePath = `${RNFS.DocumentDirectoryPath}/valuation_images/${filename}`;
    }

    // Create directory if it doesn't exist
    const dirPath = savePath.substring(0, savePath.lastIndexOf('/'));
    const dirExists = await RNFS.exists(dirPath);
    if (!dirExists) {
      await RNFS.mkdir(dirPath);
    }

    // Remove "file://" prefix if present
    const sourceUri = uri.startsWith('file://') ? uri.slice(7) : uri;

    // Copy image to our local directory
    await RNFS.copyFile(sourceUri, savePath);

    console.log('[ImageHandler] Image saved to:', savePath);
    return `file://${savePath}`;
  } catch (error) {
    console.error('[ImageHandler] Failed to save image:', error);
    return null;
  }
};
