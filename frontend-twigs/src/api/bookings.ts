import api from './axios';
import { Booking, CreateBookingDto, BoardBookingDto } from '../types';

/**
 * Bookings API endpoints
 * Based on backend bookings controller
 */

export const bookingsAPI = {
  // Create booking (USER only) - POST /bookings
  create: async (data: CreateBookingDto): Promise<Booking> => {
    const response = await api.post<Booking>('/bookings', data);
    return response.data;
  },

  // Get my bookings (USER only) - GET /bookings/my
  getMyBookings: async (): Promise<Booking[]> => {
    const response = await api.get<Booking[]>('/bookings/my');
    return response.data;
  },

  // Get booking by ID (USER only) - GET /bookings/:id
  getById: async (id: string): Promise<Booking> => {
    const response = await api.get<Booking>(`/bookings/${id}`);
    return response.data;
  },

  // Cancel booking (USER only) - PATCH /bookings/:id/cancel
  cancel: async (id: string): Promise<Booking> => {
    const response = await api.patch<Booking>(`/bookings/${id}/cancel`);
    return response.data;
  },

  // Board booking (AIRWAY_PROVIDER only) - PATCH /bookings/:id/board
  board: async (id: string, data: BoardBookingDto): Promise<Booking> => {
    const response = await api.patch<Booking>(`/bookings/${id}/board`, data);
    return response.data;
  },
};

