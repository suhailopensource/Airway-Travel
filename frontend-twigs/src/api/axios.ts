import axios, { AxiosInstance, AxiosError } from 'axios';

// Create axios instance with base URL
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// Response interceptor: Handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // 401 Unauthorized - Session expired or invalid
      if (error.response.status === 401) {
        // Clear any stale local storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      // 403 Forbidden - Access denied
      if (error.response.status === 403) {
        // Could show a toast notification here
        console.error('Access denied');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

