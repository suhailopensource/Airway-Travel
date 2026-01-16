import api from './axios';
import { User, UserBookingHistory } from '../types';

/**
 * Users API endpoints
 * Based on backend users controller
 */

export const usersAPI = {
  // Get current user profile - GET /users/profile
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile');
    return response.data;
  },

  // Get my bookings (USER only) - GET /users/me/bookings
  getMyBookings: async (): Promise<UserBookingHistory[]> => {
    const response = await api.get<UserBookingHistory[]>('/users/me/bookings');
    return response.data;
  },
};

