import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';

/**
 * Redux store configuration.
 * Only global, long-lived state lives here:
 * - Auth (user, token, isAuthenticated)
 * - App config, permissions (future)
 * - Upload queue (future)
 *
 * UI state (forms, modals, loading flags) belongs in components/hooks, not Redux.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Additional slices added here: appConfig, permissions, uploads, etc.
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
