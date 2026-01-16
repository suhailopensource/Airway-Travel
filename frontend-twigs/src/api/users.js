import api from './axios';

/**
 * Users API endpoints
 * Based on backend users controller
 */

export const usersAPI = {
  // Get current user profile - GET /users/profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Get my bookings (USER only) - GET /users/me/bookings
  getMyBookings: async () => {
    const response = await api.get('/users/me/bookings');
    return response.data;
  },
};

