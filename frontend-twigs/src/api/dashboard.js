import api from './axios';

/**
 * Dashboard API endpoints
 * Based on backend dashboard controller
 */

export const dashboardAPI = {
  // Get user dashboard (USER only) - GET /dashboard/user
  getUserDashboard: async () => {
    const response = await api.get('/dashboard/user');
    return response.data;
  },

  // Get provider dashboard (AIRWAY_PROVIDER only) - GET /dashboard/provider
  getProviderDashboard: async () => {
    const response = await api.get('/dashboard/provider');
    return response.data;
  },
};

