import authApi from '@src/api/services/auth.api';
import { LoginCredentials, User, AuthError } from '@src/types/auth';

/**
 * Domain service for authentication.
 * Pure functions, no React imports, no side effects beyond HTTP calls and error classification.
 */

export const authService = {
  /**
   * Authenticate user with credentials.
   * Transforms API response to domain model.
   * Throws structured error on failure.
   */
  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
    if (!credentials.username || !credentials.password) {
      throw {
        code: 'INVALID_CREDENTIALS',
        message: 'Username and password are required',
      } as AuthError;
    }

    try {
      const response = await authApi.login(credentials);

      // API returns ERROR: "0" for success, non-zero for failure
      if (response.ERROR && response.ERROR !== '0') {
        throw {
          code: 'INVALID_CREDENTIALS',
          message: response.MESSAGE || 'Login failed',
        } as AuthError;
      }

      // Transform API response to domain model
      const user: User = {
        id: response.id || response.username || 'unknown',
        username: response.UserName || credentials.username,
        email: response.Email,
        RoleId: response.RoleId,
        TOKENID: response.TOKENID,
        ...response, // Include all other fields
      };

      const token = response.TOKENID;

      if (!token) {
        throw {
          code: 'UNKNOWN_ERROR',
          message: 'No token received from server',
        } as AuthError;
      }

      return { user, token };
    } catch (error: any) {
      // Classify network/HTTP errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          originalError: error,
        } as AuthError;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
          originalError: error,
        } as AuthError;
      }

      // Re-throw if already classified
      if (error.code) {
        throw error;
      }

      throw {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Login failed',
        originalError: error,
      } as AuthError;
    }
  },

  /**
   * Log out user and invalidate token on server.
   */
  logout: async (token: string): Promise<void> => {
    try {
      await authApi.logout(token);
    } catch (error: any) {
      console.warn('Logout API call failed:', error);
      // Don't throw; always clear local state even if server logout fails
    }
  },

  /**
   * Validate token with server.
   * Used for token refresh or startup checks.
   */
  validateToken: async (token: string): Promise<boolean> => {
    try {
      const response = await authApi.validateToken(token);
      return response.ERROR === '0' || response.ERROR === 0;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  },
};

export default authService;
