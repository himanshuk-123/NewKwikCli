import axios from 'axios';
import { setupInterceptors } from '@src/api/interceptors';

/**
 * Single HTTP client instance for all API calls.
 * Configured with:
 * - BaseURL from environment
 * - Timeout: 30s for normal requests, 60s for uploads
 * - Request/response interceptors for auth, error handling, retry logic
 * - Multipart support for file uploads
 */
const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://inspection.kwikcheck.in/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

// Setup all interceptors (auth, logging, error handling)
setupInterceptors(client);

export default client;
