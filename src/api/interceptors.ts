import { AxiosError, AxiosInstance } from 'axios';
import store from '@src/store';
import { selectToken } from '@src/store/slices/auth.slice';
import { clearAuth } from '@src/store/slices/auth.slice';

/**
 * Request Interceptor
 * Adds authentication token (TokenID) to all requests.
 */
export const setupRequestInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use(
    (config) => {
      const state = store.getState();
      const token = selectToken(state);

      if (token) {
        config.headers.TokenID = token;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

/**
 * Response Interceptor
 * Logs responses and passes them through.
 * Errors are handled by the service layer.
 */
export const setupResponseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status;

      // Log error details
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status,
        message: error.message,
      });

      // Handle 401 Unauthorized: clear auth and redirect to login
      if (status === 401) {
        console.warn('[AUTH] Unauthorized (401). Clearing auth state.');
        store.dispatch(clearAuth());
        // Navigation to login is handled by RootNavigator watching Redux state
      }

      // Return error for service layer to classify
      return Promise.reject(error);
    }
  );
};

/**
 * Setup all interceptors on client
 */
export const setupInterceptors = (client: AxiosInstance) => {
  setupRequestInterceptor(client);
  setupResponseInterceptor(client);
};
