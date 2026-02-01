import apiCallService from '../../../services/apiCallService';
import { ToastAndroid } from 'react-native';

interface ProfileImageUploadParams {
  base64String: string;
}

export const uploadProfileImageApi = async ({
  base64String,
}: ProfileImageUploadParams): Promise<any> => {
  try {
    const response = await apiCallService.post({
      service: '/App/webservice/DocumentUploadProfileImage',
      body: {
        Version: '2',
        ProfileImage: base64String,
      },
      headers: {
        Version: '2',
      },
    });

    // Check for error response (ERROR !== '0' means error)
    if (response?.ERROR && response.ERROR !== '0') {
      const errorMsg = response?.MESSAGE || 'Failed to upload profile image';
      ToastAndroid.show(errorMsg, ToastAndroid.LONG);
      throw new Error(errorMsg);
    }

    ToastAndroid.show('Profile image updated successfully', ToastAndroid.LONG);
    return response;
  } catch (error: any) {
    console.error('[uploadProfileImageApi] Error:', error);
    // Don't show toast again if it's already been shown
    if (!error.message?.includes('Failed to upload')) {
      ToastAndroid.show(
        error?.message || 'Failed to upload profile image',
        ToastAndroid.LONG
      );
    }
    throw error;
  }
};
