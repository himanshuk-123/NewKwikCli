import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid } from 'react-native';
import { replace } from './navigationService';

/**
 * Base Axios Client for KwikCheck
 */
const client = axios.create({
  baseURL: 'https://inspection.kwikcheck.in/', // Hardcoded for now as per analysis
  timeout: 60000, // Increased to 60s for large video uploads
  headers: {
    'Content-Type': 'application/json',
    'Version': '2',
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

/* Request Interceptor to add Token */
client.interceptors.request.use(
  async (config) => {
    try {
      const userCreds = await AsyncStorage.getItem('user_credentials');
      if (userCreds) {
        const parsed = JSON.parse(userCreds);
        if (parsed?.TOKENID) {
          config.headers.TokenID = parsed.TOKENID;
        }
      }
    } catch (error) {
      // Ignore token error for now
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* Response Interceptor */
client.interceptors.response.use(
  (response) => {
    // Check for token expiration or invalid token in response data
    if (response.data) {
      const errorCode = response.data.ERROR;
      const message = response.data.MESSAGE?.toLowerCase() || '';
      
      // Check for token-related errors
      if (
        errorCode === '401' ||
        errorCode === '403' ||
        message.includes('token') && (message.includes('invalid') || message.includes('expired')) ||
        message.includes('unauthorized') ||
        message.includes('session expired')
      ) {
        handleTokenExpiration();
      }
    }
    return response;
  },
  (error) => {
    // Handle HTTP 401 or 403 errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      handleTokenExpiration();
    }
    return Promise.reject(error);
  }
);

/**
 * Handle token expiration by clearing storage and navigating to login
 */
const handleTokenExpiration = async () => {
  try {
    ToastAndroid.show('Session expired. Please login again.', ToastAndroid.LONG);
    
    // Clear user credentials
    await AsyncStorage.removeItem('user_credentials');
    
    // Import auth store dynamically to avoid circular dependency
    const { useAuthStore } = await import('../features/auth/store/auth.store');
    useAuthStore.getState().logout();
    
    // Navigate to Login screen
    setTimeout(() => {
      replace('Login');
    }, 500);
  } catch (error) {
    console.error('[apiCallService] Error handling token expiration:', error);
  }
};

/**
 * API Call Service Wrapper
 * Matches the structure expected by login.api.ts (and future migrations)
 */
const apiCallService = {
  post: async (request: { service: string; body: any; headers?: any }) => {
    try {
      const config = {
        headers: {
          ...request.headers
        }
      };

      const response = await client.post(request.service, request.body, config);
      console.log(`Response from ${request.service}: `, response.data)
      return response.data;
    } catch (error: any) {
      // Return the error response data if available, to let caller handle 'ERROR' fields
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

export default apiCallService;
