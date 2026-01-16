import api from './axios';

/**
 * Auth API endpoints
 * Based on backend: /auth/register, /auth/login, /auth/logout, /auth/me
 */

export const authAPI = {
  // Register new user (auto-login after registration)
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login user (creates session)
  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Logout user (destroys session)
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Get current user from session
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

