export interface LoginCredentials {
  username?: string;
  password?: string;
}

export interface AuthResponse {
  ERROR: string;
  MESSAGE?: string;
  Status?: string;
  // Add other fields as discovered (RoleID, TokenID etc)
  [key: string]: any;
}

export interface User {
  username: string;
  token?: string;
  roleId?: string;
  details?: any;
}
