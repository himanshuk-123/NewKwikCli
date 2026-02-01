import apiCallService from '../../../services/apiCallService';
import { AppStepListDataRecord, AppStepListResponse } from '../types';
import { ToastAndroid } from 'react-native';

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
    const params = {
      LeadId: leadId,
      Version: '2',
      [paramName]: base64String, // Dynamic key (e.g., OdometerBase64)
      VehicleTypeValue: vehicleTypeValue,
      geolocation: geolocation, // Send as object, not stringified
    };

    console.log('[API] Upload Params:', {
      LeadId: params.LeadId,
      ParamName: paramName,
      Base64Length: base64String.length,
      VehicleTypeValue: params.VehicleTypeValue,
      Geolocation: geolocation,
    });

    // Call API (TOKENID will be auto-added by interceptor)
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
    const formData = new FormData();
    const normalizedUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;

    formData.append('LeadId', leadId);
    formData.append('Video1', Date.now().toString());
    formData.append('Version', '2');
    formData.append('Video1', {
      name: 'Video.mp4',
      type: 'video/mp4',
      uri: normalizedUri,
    } as any);
console.log('[API] Video Upload FormData prepared:', {
      LeadId: leadId,
      VideoUri: normalizedUri,
    });
    const response = await apiCallService.post({
      service: 'App/webservice/DocumentUploadVideo',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Version': '2',
      },
    });
console.log('[API] Video Upload Response:', response);
    if (response?.ERROR && response.ERROR !== '0') {
      ToastAndroid.show(response.MESSAGE || 'Video upload failed', ToastAndroid.SHORT);
      return null;
    }

    return response;
  } catch (error: any) {
    console.error('[API] Video Upload Exception:', error?.message || error);
    ToastAndroid.show('Failed to upload video', ToastAndroid.SHORT);
    return null;
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
