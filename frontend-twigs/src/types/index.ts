/**
 * Shared TypeScript types for the Airway Management System
 * Based on backend entities and API responses
 */

// ============================================
// ENUMS
// ============================================

export type Role = 'USER' | 'AIRWAY_PROVIDER';

export type FlightStatus = 'SCHEDULED' | 'CANCELLED' | 'IN_AIR' | 'COMPLETED';

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'BOARDED' | 'NOT_BOARDED';

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser extends User {
  // Session user is the same as User, but explicitly typed for clarity
}

export interface Provider {
  id: string;
  name: string;
  email: string;
}

// ============================================
// FLIGHT TYPES
// ============================================

export interface Flight {
  id: string;
  flightNumber: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: FlightStatus;
  providerId?: string;
  provider?: Provider;
  createdAt: string;
  updatedAt: string;
}

export interface FlightSearchParams {
  source?: string;
  destination?: string;
  departureDate?: string;
  page?: number;
  limit?: number;
}

export interface FlightAvailability {
  availableSeats: number;
  totalSeats: number;
  bookedSeats: number;
}

export interface CreateFlightDto {
  flightNumber: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  price: number;
}

export interface UpdateFlightDto {
  flightNumber?: string;
  source?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  totalSeats?: number;
  price?: number;
}

// ============================================
// BOOKING TYPES
// ============================================

export interface Booking {
  id: string;
  flightId: string;
  userId: string;
  providerId?: string;
  providerName?: string;
  providerEmail?: string;
  seatCount: number;
  status: BookingStatus;
  totalPrice: number;
  bookedAt: string;
  createdAt: string;
  updatedAt: string;
  flight?: Flight;
  provider?: Provider;
}

export interface CreateBookingDto {
  flightId: string;
  seatCount: number;
}

export interface BoardBookingDto {
  status: 'BOARDED' | 'NOT_BOARDED';
}

export interface UserBookingHistory {
  id: string;
  flightId: string;
  providerId?: string;
  providerName?: string;
  providerEmail?: string;
  seatCount: number;
  status: BookingStatus;
  totalPrice: number;
  bookedAt: string;
  createdAt: string;
  updatedAt: string;
  flight: Flight;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface UserDashboard {
  totalBookings: number;
  upcomingFlights?: Flight[];
  pastFlights?: Flight[];
}

export interface ProviderDashboard {
  totalFlights: number;
  totalSeats: number;
  bookedSeats: number;
  flights: Array<{
    flightId: string;
    flightNumber: string;
    origin?: string;
    destination?: string;
    departureTime?: string;
    bookedSeats?: number;
    totalSeats?: number;
    availableSeats?: number;
    boardingCount?: number;
  }>;
}

export interface FlightPassenger {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  seatCount: number;
  status: BookingStatus;
  bookedAt: string;
  totalAmount?: number;
  bookingCount?: number;
  firstBookingDate?: string;
}

export interface FlightPassengerListDto {
  flightId: string;
  flightNumber: string;
  source?: string;
  destination?: string;
  departureTime?: string;
  totalPassengers?: number;
  totalRevenue?: number;
  totalSeatsBooked?: number;
  passengers: FlightPassenger[];
}

// ============================================
// AUTH TYPES
// ============================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

