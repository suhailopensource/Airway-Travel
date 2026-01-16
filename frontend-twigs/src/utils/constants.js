/**
 * Application constants
 * Based on backend enums and configurations
 */

export const ROLES = {
  USER: 'USER',
  AIRWAY_PROVIDER: 'AIRWAY_PROVIDER',
};

export const FLIGHT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  IN_AIR: 'IN_AIR',
  COMPLETED: 'COMPLETED',
};

export const BOOKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  BOARDED: 'BOARDED',
  NOT_BOARDED: 'NOT_BOARDED',
};

// Export for use in components
export { BOOKING_STATUS as BookingStatus };

// API Base URL
export const API_BASE_URL = 'http://localhost:3000';

