import api from './axios';

/**
 * Flights API endpoints
 * Based on backend flights controller
 */

export const flightsAPI = {
  // Search flights (public) - GET /flights/search
  search: async (params = {}) => {
    const response = await api.get('/flights/search', { params });
    return response.data;
  },

  // Get flight by ID (public) - GET /flights/:id
  getById: async (id) => {
    const response = await api.get(`/flights/${id}`);
    return response.data;
  },

  // Get flight availability (public) - GET /flights/:id/availability
  getAvailability: async (id) => {
    const response = await api.get(`/flights/${id}/availability`);
    return response.data;
  },

  // Get flights by provider (public) - GET /flights/provider/:providerId
  getByProvider: async (providerId) => {
    const response = await api.get(`/flights/provider/${providerId}`);
    return response.data;
  },

  // Create flight (AIRWAY_PROVIDER only) - POST /flights
  create: async (data) => {
    const response = await api.post('/flights', data);
    return response.data;
  },

  // Get my flights (AIRWAY_PROVIDER only) - GET /flights/my
  getMyFlights: async () => {
    const response = await api.get('/flights/my');
    return response.data;
  },

  // Update flight (AIRWAY_PROVIDER only) - PATCH /flights/:id
  update: async (id, data) => {
    const response = await api.patch(`/flights/${id}`, data);
    return response.data;
  },

  // Cancel flight (AIRWAY_PROVIDER only) - DELETE /flights/:id
  cancel: async (id) => {
    const response = await api.delete(`/flights/${id}`);
    return response.data;
  },

  // Get flight bookings (AIRWAY_PROVIDER only) - GET /flights/:id/bookings
  getFlightBookings: async (id) => {
    const response = await api.get(`/flights/${id}/bookings`);
    return response.data;
  },

  // Get flight passengers (AIRWAY_PROVIDER only) - GET /flights/:id/passengers
  getFlightPassengers: async (id) => {
    const response = await api.get(`/flights/${id}/passengers`);
    return response.data;
  },
};

