import apiCallService from '../../../services/apiCallService';
import { LoginCredentials, AuthResponse } from '../types';

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const request = {
    service: '/App/webservice/Login',
    body: {
      UserName: credentials.username,
      Pass: credentials.password,
      IMEI: 'a546acc999b8918e', // Legacy hardcoded value
      Version: '6',            // Legacy hardcoded value
      IP: '162.158.86.21',     // Legacy hardcoded value
      Location: null,
    },
  };

  try {
    const response = await apiCallService.post(request);

    // Check for application-level error (legacy API pattern)
    if (response.ERROR !== '0') {
      throw new Error(response.MESSAGE || 'Login failed');
    }

    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Network error');
  }
};
