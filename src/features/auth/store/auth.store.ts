import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi } from '../api/login.api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  checkLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi({ username, password });

      const userData: User = {
        username: username,
        token: response.TOKENID,
        roleId: response.RoleId,
        details: response
      };

      // Persist
      await AsyncStorage.setItem('user_credentials', JSON.stringify(response));

      set({ user: userData, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error; // Re-throw for UI to show Toast
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('user_credentials');
    set({ user: null });
  },

  checkLogin: async () => {
    set({ isLoading: true });
    try {
      const userCreds = await AsyncStorage.getItem('user_credentials');
      if (userCreds) {
        const parsed = JSON.parse(userCreds);
        const userData: User = {
          username: parsed.UserName || 'User', // Fallback as username might not be in response structure perfectly
          token: parsed.TOKENID,
          roleId: parsed.RoleId,
          details: parsed
        };
        set({ user: userData });
      }
    } catch (e) {
      // Ignore error, just don't log in
    } finally {
      set({ isLoading: false });
    }
  }
}));
