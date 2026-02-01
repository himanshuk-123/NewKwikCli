import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '@src/types/auth';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  lastAuthAt: undefined,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Mark auth as loading (e.g., during login attempt).
     */
    setAuthLoading: (state) => {
      state.loading = true;
      state.error = null;
    },

    /**
     * Store authenticated user and token.
     * Called on successful login.
     */
    setAuthSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
      state.error = null;
      state.lastAuthAt = Date.now();
    },

    /**
     * Store auth error.
     * Called on login failure.
     */
    setAuthError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },

    /**
     * Clear auth state on logout.
     */
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    },

    /**
     * Restore auth from persisted storage (e.g., on app launch).
     */
    restoreAuth: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setAuthLoading, setAuthSuccess, setAuthError, clearAuth, restoreAuth } =
  authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
