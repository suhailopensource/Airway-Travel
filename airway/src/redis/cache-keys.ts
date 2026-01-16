/**
 * Cache Key Constants and Utilities
 * 
 * This module defines all cache key patterns used throughout the application.
 * Following a consistent naming convention ensures easy cache management and invalidation.
 * 
 * Cache Key Format: `{prefix}:{identifier}`
 * 
 * Examples:
 * - `flight:search:{hash}` - Flight search results
 * - `flight:availability:{flightId}` - Seat availability for a flight
 * - `lock:booking:flight:{flightId}` - Booking lock for a flight
 */

import * as crypto from 'crypto';

/**
 * Cache key prefixes
 */
export const CACHE_PREFIXES = {
  FLIGHT_SEARCH: 'flight:search',
  FLIGHT_AVAILABILITY: 'flight:availability',
  BOOKING_LOCK: 'lock:booking:flight',
  DASHBOARD_USER: 'dashboard:user',
  DASHBOARD_PROVIDER: 'dashboard:provider',
  FLIGHTS_BY_PROVIDER: 'flights:provider',
  BOOKINGS_BY_USER: 'bookings:user',
  FLIGHT_BOOKINGS: 'flight:bookings',
  FLIGHT_PASSENGERS: 'flight:passengers',
} as const;

/**
 * Generate cache key for flight search results
 * Creates a deterministic key based on search parameters
 */
export function getFlightSearchCacheKey(params: {
  source?: string;
  destination?: string;
  departureDate?: string;
  providerName?: string;
  flightNumber?: string;
  page?: number;
  limit?: number;
}): string {
  // Normalize parameters for consistent hashing
  const normalized = {
    source: (params.source || '').toLowerCase().trim(),
    destination: (params.destination || '').toLowerCase().trim(),
    departureDate: params.departureDate || '',
    providerName: (params.providerName || '').toLowerCase().trim(),
    flightNumber: (params.flightNumber || '').toUpperCase().trim(),
    page: params.page || 1,
    limit: params.limit || 10,
  };

  // Create a deterministic hash from normalized parameters
  const hashInput = JSON.stringify(normalized);
  
  // Use SHA-256 hash for better distribution and collision resistance
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  // Use first 16 characters of hash for shorter key (sufficient for uniqueness)
  const hashStr = hash.substring(0, 16);
  
  return `${CACHE_PREFIXES.FLIGHT_SEARCH}:${hashStr}`;
}

/**
 * Generate cache key for flight availability
 */
export function getFlightAvailabilityCacheKey(flightId: string): string {
  return `${CACHE_PREFIXES.FLIGHT_AVAILABILITY}:${flightId}`;
}

/**
 * Generate cache key for booking lock
 */
export function getBookingLockKey(flightId: string): string {
  return `${CACHE_PREFIXES.BOOKING_LOCK}:${flightId}`;
}

/**
 * Generate pattern to invalidate all flight search caches
 * Use this when flights are created, updated, or cancelled
 */
export function getFlightSearchCachePattern(): string {
  return `${CACHE_PREFIXES.FLIGHT_SEARCH}:*`;
}

/**
 * Generate pattern to invalidate all availability caches for a specific flight
 */
export function getFlightAvailabilityCachePattern(flightId: string): string {
  return `${CACHE_PREFIXES.FLIGHT_AVAILABILITY}:${flightId}`;
}

/**
 * Generate cache key for user dashboard
 */
export function getUserDashboardCacheKey(userId: string): string {
  return `${CACHE_PREFIXES.DASHBOARD_USER}:${userId}`;
}

/**
 * Generate cache key for provider dashboard
 */
export function getProviderDashboardCacheKey(providerId: string): string {
  return `${CACHE_PREFIXES.DASHBOARD_PROVIDER}:${providerId}`;
}

/**
 * Generate cache key for flights by provider
 */
export function getFlightsByProviderCacheKey(providerId: string): string {
  return `${CACHE_PREFIXES.FLIGHTS_BY_PROVIDER}:${providerId}`;
}

/**
 * Generate cache key for bookings by user
 */
export function getBookingsByUserCacheKey(userId: string): string {
  return `${CACHE_PREFIXES.BOOKINGS_BY_USER}:${userId}`;
}

/**
 * Generate cache key for flight bookings list
 */
export function getFlightBookingsCacheKey(flightId: string): string {
  return `${CACHE_PREFIXES.FLIGHT_BOOKINGS}:${flightId}`;
}

/**
 * Generate cache key for flight passengers list
 */
export function getFlightPassengersCacheKey(flightId: string): string {
  return `${CACHE_PREFIXES.FLIGHT_PASSENGERS}:${flightId}`;
}

/**
 * Generate pattern to invalidate all user dashboard caches
 */
export function getUserDashboardCachePattern(userId: string): string {
  return `${CACHE_PREFIXES.DASHBOARD_USER}:${userId}`;
}

/**
 * Generate pattern to invalidate all provider dashboard caches
 */
export function getProviderDashboardCachePattern(providerId: string): string {
  return `${CACHE_PREFIXES.DASHBOARD_PROVIDER}:${providerId}`;
}

/**
 * Generate pattern to invalidate all flights by provider caches
 */
export function getFlightsByProviderCachePattern(providerId: string): string {
  return `${CACHE_PREFIXES.FLIGHTS_BY_PROVIDER}:${providerId}`;
}

/**
 * Generate pattern to invalidate all bookings by user caches
 */
export function getBookingsByUserCachePattern(userId: string): string {
  return `${CACHE_PREFIXES.BOOKINGS_BY_USER}:${userId}`;
}

