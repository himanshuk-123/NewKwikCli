import apiCallService from '../../../services/apiCallService';
import axios from 'axios';
import { AppStepListDataRecord, AppStepListResponse } from '../types';
import { ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// Re-export multipart upload function
export { uploadValuationImageMultipart } from './valuation.images.api';

export const fetchAppStepListApi = async (leadId: string): Promise<AppStepListDataRecord[]> => {
  try {
    // Use URLSearchParams for x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('LeadId', leadId);
    params.append('Version', '2');
    params.append('StepName', '');
    params.append('DropDownName', '');

    const response = await apiCallService.post({
      service: 'App/webservice/AppStepList',
      body: params.toString(), // Send as string
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }) as AppStepListResponse;

    if (response.ERROR !== '0') {
      console.warn('AppStepList API Error:', response.MESSAGE);
      ToastAndroid.show(response.MESSAGE || 'Failed to fetch valuation steps', ToastAndroid.SHORT);
      return [];
    }

    return response.DataList || [];

  } catch (error: any) {
    console.error('AppStepList API Exception:', error);
    ToastAndroid.show('Something went wrong fetching steps', ToastAndroid.SHORT);
    return [];
  }
}

export const uploadValuationImageApi = async (
  base64String: string,
  paramName: string,
  leadId: string,
  vehicleTypeValue: string,
  geolocation: { lat: string; long: string; timeStamp: string }
): Promise<any> => {
  try {
    // Get user token (same as expo production app)
    const userCredsJson = await AsyncStorage.getItem('user_credentials');
    const userCreds = userCredsJson ? JSON.parse(userCredsJson) : {};
    const tokenId = userCreds?.TOKENID || '';

    // ⭐ SAME AS EXPO PRODUCTION APP - Send TOKENID in body too!
    const params = {
      LeadId: leadId,
      TOKENID: tokenId,  // ← Added to match expo app
      Version: '2',
      [paramName]: base64String, // Dynamic key (e.g., OdomerterBase64, FrontImgBase64)
      geolocation: geolocation, // Send as object, not stringified
    };

    console.log('[API] Upload Params:', {
      LeadId: params.LeadId,
      TOKENID: tokenId ? '[SET]' : '[MISSING]',
      ParamName: paramName,
      Base64Length: base64String.length,
      Geolocation: geolocation,
    });

    // Call API (TOKENID also in headers via interceptor)
    const response = await apiCallService.post({
      service: 'App/webservice/DocumentUploadOtherImageApp',
      body: params,
      headers: {
        'Version': '2',
      }
    });

    console.log('[API] Upload Response:', response);

    if (response?.ERROR && response.ERROR !== '0') {
      throw new Error(response?.MESSAGE || 'Server rejected the upload');
    }

    return response;

  } catch (error: any) {
    console.error('[API] Upload Exception:', error?.message || error);
    throw error;
  }
};

export const uploadValuationVideoApi = async (
  videoUri: string,
  leadId: string
): Promise<any> => {
  try {
    // Get user credentials (for TokenID)
    const userCredsJson = await AsyncStorage.getItem('user_credentials');
    const userCreds = userCredsJson ? JSON.parse(userCredsJson) : {};
    const tokenId = userCreds?.TOKENID || '';

    if (!tokenId) {
      throw new Error('User token not found. Please login again.');
    }

    const normalizedUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;

    // CRITICAL FIX 1: Verify file exists before attempting upload
    const filePath = normalizedUri.replace('file://', '');
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error(`Video file not found at: ${filePath}`);
    }

    // CRITICAL FIX 2: Check file size to determine appropriate timeout
    try {
      const fileInfo = await RNFS.stat(filePath);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      console.log('[API] Video file size:', `${fileSizeMB.toFixed(2)}MB`);

      if (fileSizeMB === 0) {
        throw new Error('Video file is empty');
      }

      if (fileSizeMB > 100) {
        throw new Error(
          `Video exceeds server limit: ${fileSizeMB.toFixed(2)}MB (Max: 100MB). ` +
          `Cloudflare enforces this limit. Use a shorter or lower quality video.`
        );
      }
    } catch (error: any) {
      if (error.message.includes('too large') || error.message.includes('empty')) {
        throw error;
      }
      console.warn('[API] Could not determine file size:', error?.message);
    }

    const formData = new FormData();

    console.log('[API] Preparing video upload FormData:', {
      LeadId: leadId,
      VideoUri: normalizedUri,
      TokenID: tokenId,
      FileExists: fileExists,
    });

    // Append in exact order like production app
    formData.append('LeadId', leadId);
    formData.append('Video1', Date.now().toString());
    formData.append('TokenID', tokenId);
    formData.append('Version', '2');
    formData.append('Video1', {
      name: 'Video.mp4',
      type: 'video/mp4',
      uri: normalizedUri,
    } as any);

    console.log('[API] FormData created, making request to DocumentUploadVideo');

    // CRITICAL FIX 3: Increase timeout based on file size
    // Large videos need more time: calculate based on ~100KB/sec minimum on slow 3G
    let timeout = 60000; // Default 60 seconds for small videos
    try {
      const fileInfo = await RNFS.stat(filePath);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      // For 100MB video: 100MB / 100KB/sec = 1000 seconds, plus 60s buffer
      timeout = Math.max(60000, (fileSizeMB * 10000) + 60000);
      console.log('[API] Adjusted timeout for video size:', `${(timeout / 1000).toFixed(0)}s for ${fileSizeMB.toFixed(2)}MB video`);
    } catch (error) {
      console.warn('[API] Could not adjust timeout, using default');
    }

    // ⭐ DIRECT AXIOS CALL - Matching Expo App Logic
    // Using simple axios.post bypasses the wrapper's interceptors which might be causing issues with multipart
    const response = await axios.post(
      'https://inspection.kwikcheck.in/App/webservice/DocumentUploadVideo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': '*/*',
          'TokenID': tokenId, // Explicitly set TokenID header
          'Version': '2',
        },
        timeout: timeout,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log('[API] Video Upload Response:', response.data);

    if (!response || !response.data) {
      throw new Error('No response from server');
    }

    if (response.data?.ERROR && response.data.ERROR !== '0') {
      throw new Error(response.data.MESSAGE || 'Video upload failed');
    }

    return response.data;
  } catch (error: any) {
    console.error('[API] Video Upload Exception:', error?.message || error);

    // Parse error to give better feedback
    const errorMsg = error?.message || String(error);
    let userMessage = 'Failed to upload video.';

    if (errorMsg.includes('413') || errorMsg.includes('Payload Too Large')) {
      userMessage = 'Video file is too large. Please use a shorter or lower quality video (Max: 100MB).';
    } else if (errorMsg.includes('timeout')) {
      userMessage = 'Upload took too long - network may be unstable. Please try again with Wi-Fi.';
    } else if (errorMsg.includes('offline') || errorMsg.includes('network')) {
      userMessage = 'No internet connection. Will retry when online.';
    } else if (errorMsg.includes('not found')) {
      userMessage = 'Video file was deleted. Please record again.';
    }

    throw new Error(userMessage);
  }
};

export const submitLeadReportApi = async (payload: any): Promise<any> => {
  try {
    const response = await apiCallService.post({
      service: 'App/webservice/LeadReportDataCreateEdit',
      body: payload
    });

    if (response.ERROR && response.ERROR !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Report submission failed', ToastAndroid.SHORT);
      return null;
    }
    return response;
  } catch (error: any) {
    console.error('Report API Exception:', error);
    ToastAndroid.show('Failed to submit info', ToastAndroid.SHORT);
    return null;
  }
};
