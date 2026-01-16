import api from './axios';
import { UserDashboard, ProviderDashboard } from '../types';

/**
 * Dashboard API endpoints
 * Based on backend dashboard controller
 */

export const dashboardAPI = {
  // Get user dashboard (USER only) - GET /dashboard/user
  getUserDashboard: async (): Promise<UserDashboard> => {
    const response = await api.get<UserDashboard>('/dashboard/user');
    return response.data;
  },

  // Get provider dashboard (AIRWAY_PROVIDER only) - GET /dashboard/provider
  getProviderDashboard: async (): Promise<ProviderDashboard> => {
    const response = await api.get<ProviderDashboard>('/dashboard/provider');
    return response.data;
  },
};

