import api from './axios';

/**
 * Auth API endpoints
 * Based on backend: /auth/register, /auth/login, /auth/validate-token
 */

export const authAPI = {
  // Register new user
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Validate token
  validateToken: async (token) => {
    const response = await api.get('/auth/validate-token', {
      params: { token },
    });
    return response.data;
  },
};

