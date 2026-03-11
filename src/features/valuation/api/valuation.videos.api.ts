import apiCallService from '../../../services/apiCallService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Upload valuation video using multipart/form-data
 * Safe for large videos and retry-based uploads
 */
export const uploadValuationVideoApi = async (
  videoUri: string,
  leadId: string
): Promise<any> => {
  try {
    // Get token from storage
    const credsJson = await AsyncStorage.getItem('user_credentials');
    const creds = credsJson ? JSON.parse(credsJson) : {};
    const tokenId = creds?.TOKENID;

    if (!tokenId) {
      throw new Error('Auth token missing. Please login again.');
    }

    const formData = new FormData();

    const normalizedUri = videoUri.startsWith('file://')
      ? videoUri
      : `file://${videoUri}`;

    // Backend-required order
    formData.append('LeadId', leadId);
    formData.append('Video1', Date.now().toString()); // metadata
    formData.append('TokenID', tokenId);
    formData.append('Version', '2');

    // Actual video file
    formData.append('Video1', {
      uri: normalizedUri,
      type: 'video/mp4',
      name: 'valuation-video.mp4',
    } as any);

    const response = await apiCallService.post({
      service: 'App/webservice/DocumentUploadVideo',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': '*/*',
        'Version': '2',
      },
      timeout: 120000, // videos can be big
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (!response) {
      throw new Error('No response from server');
    }

    if (response?.ERROR && response.ERROR !== '0') {
      throw new Error(response.MESSAGE || 'Video upload failed');
    }

    return response;
  } catch (error: any) {
    console.error('[API] Video upload failed:', error?.message || error);
    throw error;
  }
};
