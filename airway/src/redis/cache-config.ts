/**
 * Cache Configuration - TTL (Time To Live) Strategy
 * 
 * This module defines TTL values for different cache types.
 * TTL strategy balances cache freshness with performance.
 */

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  /**
   * Flight search results cache TTL
   * 
   * Rationale:
   * - Flight search results change relatively infrequently
   * - New flights are created occasionally, not constantly
   * - 5 minutes provides good balance between freshness and performance
   * - Search queries are expensive (OpenSearch + DB queries)
   * 
   * Invalidation: Automatically invalidated when flights are created/updated/cancelled
   */
  FLIGHT_SEARCH: 5 * 60, // 5 minutes

  /**
   * Seat availability cache TTL
   * 
   * Rationale:
   * - Seat availability changes frequently during booking operations
   * - Users need real-time accurate availability information
   * - 30 seconds ensures data is fresh enough for booking decisions
   * - Short TTL prevents stale data from causing booking conflicts
   * 
   * Invalidation: Automatically invalidated when:
   * - Bookings are created (seats decrease)
   * - Bookings are cancelled (seats increase)
   * - Flight is updated/cancelled
   */
  FLIGHT_AVAILABILITY: 30, // 30 seconds

  /**
   * Booking lock TTL
   * 
   * Rationale:
   * - Prevents concurrent booking attempts on the same flight
   * - 30 seconds is enough time for a booking transaction to complete
   * - Prevents deadlocks if a process crashes while holding a lock
   * - Should be longer than typical booking operation time (~5-10 seconds)
   * 
   * Note: Locks are manually released after transaction completes
   */
  BOOKING_LOCK: 30, // 30 seconds

  /**
   * User dashboard cache TTL
   * 
   * Rationale:
   * - Dashboard stats change when bookings are created/cancelled
   * - 2 minutes provides good balance between freshness and performance
   * - Dashboard queries are expensive (multiple joins, aggregations)
   * - Users don't need real-time dashboard updates
   * 
   * Invalidation: Automatically invalidated when user bookings change
   */
  DASHBOARD_USER: 2 * 60, // 2 minutes

  /**
   * Provider dashboard cache TTL
   * 
   * Rationale:
   * - Dashboard stats change when flights/bookings are created/updated/cancelled
   * - 2 minutes provides good balance between freshness and performance
   * - Dashboard queries are expensive (multiple joins, aggregations)
   * - Providers don't need real-time dashboard updates
   * 
   * Invalidation: Automatically invalidated when provider flights/bookings change
   */
  DASHBOARD_PROVIDER: 2 * 60, // 2 minutes

  /**
   * Flights by provider cache TTL
   * 
   * Rationale:
   * - Flights list changes when flights are created/updated/cancelled
   * - 3 minutes provides good balance for large datasets
   * - This endpoint can return many flights with joins
   * - Public endpoint, so caching reduces database load significantly
   * 
   * Invalidation: Automatically invalidated when provider flights change
   */
  FLIGHTS_BY_PROVIDER: 3 * 60, // 3 minutes

  /**
   * Bookings by user cache TTL
   * 
   * Rationale:
   * - Bookings list changes when bookings are created/cancelled
   * - 1 minute provides good balance for user's booking history
   * - This endpoint can return many bookings with flight/user joins
   * - Users may check their bookings frequently
   * 
   * Invalidation: Automatically invalidated when user bookings change
   */
  BOOKINGS_BY_USER: 1 * 60, // 1 minute

  /**
   * Flight bookings list cache TTL
   * 
   * Rationale:
   * - Bookings list changes when bookings are created/cancelled for the flight
   * - 1 minute provides good balance for provider viewing bookings
   * - This endpoint can return many bookings with user joins
   * - Providers may check bookings frequently
   * 
   * Invalidation: Automatically invalidated when flight bookings change
   */
  FLIGHT_BOOKINGS: 1 * 60, // 1 minute

  /**
   * Flight passengers list cache TTL
   * 
   * Rationale:
   * - Passengers list changes when bookings are created/cancelled for the flight
   * - 1 minute provides good balance for provider viewing passengers
   * - This endpoint performs expensive aggregations
   * - Providers may check passenger lists frequently
   * 
   * Invalidation: Automatically invalidated when flight bookings change
   */
  FLIGHT_PASSENGERS: 1 * 60, // 1 minute
} as const;

/**
 * Cache invalidation rules
 * 
 * When to invalidate caches:
 * 
 * 1. Flight Search Cache:
 *    - When a new flight is created (new results may appear)
 *    - When a flight is updated (results may change)
 *    - When a flight is cancelled (should not appear in results)
 *    - Pattern: Invalidate all search caches (search:*) since any flight change
 *      could affect any search query
 * 
 * 2. Seat Availability Cache:
 *    - When a booking is created (availableSeats decreases)
 *    - When a booking is cancelled (availableSeats increases)
 *    - When a flight is updated (price, times, etc. may affect availability)
 *    - When a flight is cancelled (availability becomes 0)
 *    - Pattern: Invalidate specific flight availability cache (availability:{flightId})
 * 
 * 3. Booking Locks:
 *    - Automatically expire after TTL (30 seconds)
 *    - Manually released after booking transaction completes
 *    - No manual invalidation needed (locks are temporary by nature)
 */

