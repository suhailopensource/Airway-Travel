import api from './axios';
import { LoginDto, RegisterDto, AuthResponse } from '../types';

/**
 * Auth API endpoints
 * Based on backend: /auth/register, /auth/login, /auth/logout, /auth/me
 */

export const authAPI = {
  // Register new user (auto-login after registration)
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  // Login user (creates session)
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  // Logout user (destroys session)
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  // Get current user from session
  getCurrentUser: async (): Promise<AuthResponse | null> => {
    try {
      const response = await api.get<AuthResponse>('/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

