import apiCallService from '../../../services/apiCallService';

/**
 * Upload image via multipart/form-data (NO base64)
 * This is safe for large images and background-friendly.
 */
export const uploadValuationImageMultipart = async (
  imageUri: string,
  paramName: string,          // e.g. OdometerBase64 (server expects this key)
  leadId: string,
  vehicleTypeValue: string,
  geolocation: { lat: string; long: string; timeStamp: string }
): Promise<any> => {
  try {
    const formData = new FormData();

    const normalizedUri = imageUri.startsWith('file://')
      ? imageUri
      : `file://${imageUri}`;

    // Mandatory fields
    formData.append('LeadId', leadId);
    formData.append('Version', '2');
    formData.append('VehicleTypeValue', vehicleTypeValue);

    // If backend expects geolocation as object/string
    formData.append('geolocation', JSON.stringify(geolocation));

    // IMPORTANT:
    // paramName must match backend expectation (e.g. OdometerBase64)
    formData.append(paramName, {
      uri: normalizedUri,
      type: 'image/jpeg',
      name: `${paramName}.jpg`,
    } as any);

    const response = await apiCallService.post({
      service: 'App/webservice/DocumentUploadOtherImageApp',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Version': '2',
        'Accept': '*/*',
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (!response) {
      throw new Error('No response from server');
    }

    if (response?.ERROR && response.ERROR !== '0') {
      throw new Error(response.MESSAGE || 'Image upload failed');
    }

    return response;
  } catch (error: any) {
    console.error('[API] Image upload failed:', error?.message || error);
    throw error;
  }
};
