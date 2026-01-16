/**
 * Application constants
 * Based on backend enums and configurations
 */

import { Role, FlightStatus, BookingStatus } from '../types';

export const ROLES: Record<string, Role> = {
  USER: 'USER',
  AIRWAY_PROVIDER: 'AIRWAY_PROVIDER',
};

export const FLIGHT_STATUS: Record<string, FlightStatus> = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  IN_AIR: 'IN_AIR',
  COMPLETED: 'COMPLETED',
};

export const BOOKING_STATUS: Record<string, BookingStatus> = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  BOARDED: 'BOARDED',
  NOT_BOARDED: 'NOT_BOARDED',
};

// Export for use in components
export { BOOKING_STATUS as BookingStatus };

// API Base URL
export const API_BASE_URL = 'http://localhost:3000';

