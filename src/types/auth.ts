// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id?: string;
  username: string;
  email?: string;
  RoleId: number;
  TOKENID: string;
  // Additional fields from API
  [key: string]: any;
}

export interface LoginResponse {
  ERROR: string; // "0" for success, non-zero for error
  MESSAGE?: string;
  user?: User;
  TOKENID?: string;
  RoleId?: number;
  // Full user object from API
  [key: string]: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  lastAuthAt?: number; // timestamp of last successful auth
}

export interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  originalError?: any;
}
