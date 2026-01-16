import api from './axios';
import {
  Flight,
  FlightSearchParams,
  FlightAvailability,
  CreateFlightDto,
  UpdateFlightDto,
} from '../types';

/**
 * Flights API endpoints
 * Based on backend flights controller
 */

export const flightsAPI = {
  // Search flights (public) - GET /flights/search
  search: async (params: FlightSearchParams = {}): Promise<Flight[]> => {
    const response = await api.get<Flight[]>('/flights/search', { params });
    return response.data;
  },

  // Get flight by ID (public) - GET /flights/:id
  getById: async (id: string): Promise<Flight> => {
    const response = await api.get<Flight>(`/flights/${id}`);
    return response.data;
  },

  // Get flight availability (public) - GET /flights/:id/availability
  getAvailability: async (id: string): Promise<FlightAvailability> => {
    const response = await api.get<FlightAvailability>(`/flights/${id}/availability`);
    return response.data;
  },

  // Get flights by provider (public) - GET /flights/provider/:providerId
  getByProvider: async (providerId: string): Promise<Flight[]> => {
    const response = await api.get<Flight[]>(`/flights/provider/${providerId}`);
    return response.data;
  },

  // Create flight (AIRWAY_PROVIDER only) - POST /flights
  create: async (data: CreateFlightDto): Promise<Flight> => {
    const response = await api.post<Flight>('/flights', data);
    return response.data;
  },

  // Get my flights (AIRWAY_PROVIDER only) - GET /flights/my
  getMyFlights: async (): Promise<Flight[]> => {
    const response = await api.get<Flight[]>('/flights/my');
    return response.data;
  },

  // Update flight (AIRWAY_PROVIDER only) - PATCH /flights/:id
  update: async (id: string, data: UpdateFlightDto): Promise<Flight> => {
    const response = await api.patch<Flight>(`/flights/${id}`, data);
    return response.data;
  },

  // Cancel flight (AIRWAY_PROVIDER only) - DELETE /flights/:id
  cancel: async (id: string): Promise<void> => {
    await api.delete(`/flights/${id}`);
  },

  // Get flight bookings (AIRWAY_PROVIDER only) - GET /flights/:id/bookings
  getFlightBookings: async (id: string): Promise<unknown> => {
    const response = await api.get(`/flights/${id}/bookings`);
    return response.data;
  },

  // Get flight passengers (AIRWAY_PROVIDER only) - GET /flights/:id/passengers
  getFlightPassengers: async (id: string): Promise<unknown> => {
    const response = await api.get(`/flights/${id}/passengers`);
    return response.data;
  },
};

