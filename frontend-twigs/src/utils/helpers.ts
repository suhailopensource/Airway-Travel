/**
 * Helper utility functions
 */

import { Flight } from '../types';

/**
 * Decode JWT token to get payload (for UI display only, backend is source of truth)
 */
export const decodeToken = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp || typeof decoded.exp !== 'number') return true;
  return Date.now() >= decoded.exp * 1000;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Check if flight can be booked
 * Based on backend validation rules
 */
export const canBookFlight = (flight: Flight | null | undefined): boolean => {
  if (!flight) return false;
  
  // Cannot book if flight is cancelled
  if (flight.status === 'CANCELLED') return false;
  
  // Cannot book if departure time has passed
  const now = new Date();
  const departureTime = new Date(flight.departureTime);
  if (now >= departureTime) return false;
  
  // Cannot book if no seats available
  if (flight.availableSeats <= 0) return false;
  
  return true;
};

/**
 * Check if flight can be updated
 * Based on backend validation rules
 */
export const canUpdateFlight = (flight: Flight | null | undefined): boolean => {
  if (!flight) return false;
  
  // Cannot update if flight is cancelled
  if (flight.status === 'CANCELLED') return false;
  
  // Cannot update if flight is completed
  if (flight.status === 'COMPLETED') return false;
  
  return true;
};

/**
 * Get the reason why a flight cannot be updated
 */
export const getFlightUpdateReason = (flight: Flight | null | undefined): string | null => {
  if (!flight) return null;
  
  if (flight.status === 'CANCELLED') {
    return 'This flight cannot be updated because it is cancelled.';
  }
  
  if (flight.status === 'COMPLETED') {
    return 'This flight cannot be updated because it has been completed.';
  }
  
  return null;
};

/**
 * Check if flight can be cancelled
 * Based on backend validation rules
 */
export const canCancelFlight = (flight: Flight | null | undefined): boolean => {
  if (!flight) return false;
  
  // Cannot cancel if already cancelled
  if (flight.status === 'CANCELLED') return false;
  
  // Cannot cancel if flight has already departed
  const now = new Date();
  const departureTime = new Date(flight.departureTime);
  if (now >= departureTime) return false;
  
  // Can only cancel SCHEDULED flights
  if (flight.status !== 'SCHEDULED') return false;
  
  return true;
};

