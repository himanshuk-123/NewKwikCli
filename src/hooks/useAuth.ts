import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import authService from '@src/services/domain/auth.service';
import { LoginCredentials } from '@src/types/auth';
import {
  setAuthLoading,
  setAuthSuccess,
  setAuthError,
  clearAuth,
  selectIsAuthenticated,
  selectUser,
  selectToken,
  selectAuthLoading,
  selectAuthError,
} from '@src/store/slices/auth.slice';
import { AppDispatch, RootState } from '@src/store';

/**
 * useAuth hook
 * Manages authentication state and operations.
 * Exposes clean, memoized API to components.
 * No side effects beyond service calls and Redux dispatch.
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Select state from Redux with memoization
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));
  const user = useSelector((state: RootState) => selectUser(state));
  const token = useSelector((state: RootState) => selectToken(state));
  const loading = useSelector((state: RootState) => selectAuthLoading(state));
  const error = useSelector((state: RootState) => selectAuthError(state));

  // Local state for login operation (not Redux; UI-scoped)
  const [loginError, setLoginError] = useState<string | null>(null);

  /**
   * Attempt login with provided credentials.
   * Wrapped in useCallback to prevent re-render if dependencies don't change.
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoginError(null);
      dispatch(setAuthLoading());

      try {
        const { user: authUser, token: authToken } = await authService.login(credentials);
        dispatch(setAuthSuccess({ user: authUser, token: authToken }));
        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || 'Login failed. Please try again.';
        setLoginError(errorMessage);
        dispatch(setAuthError(errorMessage));
        return { success: false, error: errorMessage };
      }
    },
    [dispatch]
  );

  /**
   * Log out the current user.
   * Clears Redux state and local token.
   */
  const logout = useCallback(async () => {
    if (token) {
      // Call logout API, but don't fail if it errors (server may be down)
      try {
        await authService.logout(token);
      } catch (err) {
        console.warn('Logout API failed:', err);
      }
    }

    // Always clear local state
    dispatch(clearAuth());
    setLoginError(null);
  }, [token, dispatch]);

  return {
    // State
    isAuthenticated,
    user,
    token,
    loading,
    error: loginError || error,

    // Actions
    login,
    logout,
  };
};

export default useAuth;
