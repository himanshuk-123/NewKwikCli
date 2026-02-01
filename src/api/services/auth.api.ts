import client from '../client';
import { LoginCredentials, LoginResponse, User } from '@src/types/auth';

/**
 * Pure API service layer for auth endpoints.
 * No side effects beyond HTTP calls.
 * Response transformation and error classification happen in domain service.
 */

export const authApi = {
  /**
   * POST /App/webservice/Login
   * Sends credentials and device info, returns user token.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/App/webservice/Login', {
      UserName: credentials.username,
      Pass: credentials.password,
      IMEI: 'a546acc999b8918e', // Device ID (static for demo; can be fetched from native)
      Version: '6',
      IP: '162.158.86.21', // Can be retrieved from API
      Location: null,
    });

    return response.data;
  },

  /**
   * POST /App/webservice/Logout
   * Invalidates token on server.
   */
  logout: async (token: string): Promise<{ ERROR: string; MESSAGE?: string }> => {
    const response = await client.post('/App/webservice/TokenLogout', {
      TOKENID: token,
      Version: '2',
    });

    return response.data;
  },  

  /**
   * POST /App/webservice/GetTokenValidity
   * Checks if token is still valid.
   */
  validateToken: async (token: string): Promise<{ ERROR: string; MESSAGE?: string }> => {
    const response = await client.post('/App/webservice/GetTokenValidity', {
      TOKENID: token,
      Version: '2',
    });

    return response.data;
  },
};

export default authApi;
