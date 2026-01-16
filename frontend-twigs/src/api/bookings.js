import api from './axios';

/**
 * Bookings API endpoints
 * Based on backend bookings controller
 */

export const bookingsAPI = {
  // Create booking (USER only) - POST /bookings
  create: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  // Get my bookings (USER only) - GET /bookings/my
  getMyBookings: async () => {
    const response = await api.get('/bookings/my');
    return response.data;
  },

  // Get booking by ID (USER only) - GET /bookings/:id
  getById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  // Cancel booking (USER only) - PATCH /bookings/:id/cancel
  cancel: async (id) => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
  },

  // Board booking (AIRWAY_PROVIDER only) - PATCH /bookings/:id/board
  board: async (id, data) => {
    const response = await api.patch(`/bookings/${id}/board`, data);
    return response.data;
  },
};

