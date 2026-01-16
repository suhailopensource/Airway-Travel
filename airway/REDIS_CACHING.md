# Redis Caching Implementation

This document describes the Redis caching strategy implemented for the Airway application, including cache keys, TTL (Time To Live) strategies, and cache invalidation rules.

## Overview

Redis caching is used to improve performance and reduce database load for:
1. **Flight Search Results** - Caches expensive search queries
2. **Seat Availability** - Caches real-time seat availability information
3. **Temporary Booking Locks** - Prevents concurrent booking attempts
4. **Dashboard Statistics** - Caches user and provider dashboard aggregations
5. **Large Data Fetches** - Caches expensive queries for flights, bookings, and passenger lists

## Cache Key Structure

All cache keys follow a consistent naming convention: `{prefix}:{identifier}`

### Cache Key Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `flight:search` | Flight search results | `flight:search:a1b2c3d4` |
| `flight:availability` | Seat availability for a flight | `flight:availability:{flightId}` |
| `lock:booking:flight` | Booking lock for a flight | `lock:booking:flight:{flightId}` |
| `dashboard:user` | User dashboard statistics | `dashboard:user:{userId}` |
| `dashboard:provider` | Provider dashboard statistics | `dashboard:provider:{providerId}` |
| `flights:provider` | All flights for a provider | `flights:provider:{providerId}` |
| `bookings:user` | All bookings for a user | `bookings:user:{userId}` |
| `flight:bookings` | All bookings for a flight | `flight:bookings:{flightId}` |
| `flight:passengers` | Passenger list for a flight | `flight:passengers:{flightId}` |

### Cache Key Generation

Cache keys are generated using utility functions in `src/redis/cache-keys.ts`:

```typescript
// Flight search cache key (deterministic hash from search parameters)
getFlightSearchCacheKey({
  source: 'New York',
  destination: 'Los Angeles',
  departureDate: '2024-12-25',
  page: 1,
  limit: 10
})
// Returns: flight:search:a1b2c3d4

// Flight availability cache key
getFlightAvailabilityCacheKey('flight-id-123')
// Returns: flight:availability:flight-id-123

// Booking lock key
getBookingLockKey('flight-id-123')
// Returns: lock:booking:flight:flight-id-123
```

## TTL (Time To Live) Strategy

TTL values are defined in `src/redis/cache-config.ts` and balance cache freshness with performance:

### Flight Search Cache: 5 minutes (300 seconds)

**Rationale:**
- Flight search results change relatively infrequently
- New flights are created occasionally, not constantly
- Search queries are expensive (OpenSearch + database queries)
- 5 minutes provides good balance between freshness and performance

**When Invalidated:**
- Automatically invalidated when flights are created, updated, or cancelled
- All search caches are invalidated (pattern: `flight:search:*`)

### Seat Availability Cache: 30 seconds

**Rationale:**
- Seat availability changes frequently during booking operations
- Users need real-time accurate availability information
- Short TTL ensures data is fresh enough for booking decisions
- Prevents stale data from causing booking conflicts

**When Invalidated:**
- When bookings are created (seats decrease)
- When bookings are cancelled (seats increase)
- When flights are updated or cancelled
- Specific flight cache is invalidated (key: `flight:availability:{flightId}`)

### Booking Lock: 30 seconds

**Rationale:**
- Prevents concurrent booking attempts on the same flight
- 30 seconds is enough time for a booking transaction to complete
- Prevents deadlocks if a process crashes while holding a lock
- Should be longer than typical booking operation time (~5-10 seconds)

**Note:** Locks are manually released after transaction completes, but TTL provides safety net.

### User Dashboard Cache: 2 minutes

**Rationale:**
- Dashboard stats change when bookings are created/cancelled
- 2 minutes provides good balance between freshness and performance
- Dashboard queries are expensive (multiple joins, aggregations)
- Users don't need real-time dashboard updates

**When Invalidated:**
- Automatically invalidated when user bookings are created/cancelled

### Provider Dashboard Cache: 2 minutes

**Rationale:**
- Dashboard stats change when flights/bookings are created/updated/cancelled
- 2 minutes provides good balance between freshness and performance
- Dashboard queries are expensive (multiple joins, aggregations)
- Providers don't need real-time dashboard updates

**When Invalidated:**
- Automatically invalidated when provider flights/bookings change

### Flights by Provider Cache: 3 minutes

**Rationale:**
- Flights list changes when flights are created/updated/cancelled
- 3 minutes provides good balance for large datasets
- This endpoint can return many flights with joins
- Public endpoint, so caching reduces database load significantly

**When Invalidated:**
- Automatically invalidated when provider flights change

### Bookings by User Cache: 1 minute

**Rationale:**
- Bookings list changes when bookings are created/cancelled
- 1 minute provides good balance for user's booking history
- This endpoint can return many bookings with flight/user joins
- Users may check their bookings frequently

**When Invalidated:**
- Automatically invalidated when user bookings change

### Flight Bookings List Cache: 1 minute

**Rationale:**
- Bookings list changes when bookings are created/cancelled for the flight
- 1 minute provides good balance for provider viewing bookings
- This endpoint can return many bookings with user joins
- Providers may check bookings frequently

**When Invalidated:**
- Automatically invalidated when flight bookings change

### Flight Passengers List Cache: 1 minute

**Rationale:**
- Passengers list changes when bookings are created/cancelled for the flight
- 1 minute provides good balance for provider viewing passengers
- This endpoint performs expensive aggregations
- Providers may check passenger lists frequently

**When Invalidated:**
- Automatically invalidated when flight bookings change

## Cache Invalidation Rules

### 1. Flight Search Cache Invalidation

**Invalidated when:**
- A new flight is created (new results may appear)
- A flight is updated (results may change)
- A flight is cancelled (should not appear in results)

**Method:**
- Pattern-based invalidation: All search caches are deleted using pattern `flight:search:*`
- Reason: Any flight change could affect any search query

**Implementation:**
```typescript
// In FlightsService.invalidateFlightCaches()
await this.redisService.deletePattern(getFlightSearchCachePattern());
```

### 2. Seat Availability Cache Invalidation

**Invalidated when:**
- A booking is created (availableSeats decreases)
- A booking is cancelled (availableSeats increases)
- A flight is updated (price, times, etc. may affect availability)
- A flight is cancelled (availability becomes 0)

**Method:**
- Specific key invalidation: Only the affected flight's cache is deleted
- Key: `flight:availability:{flightId}`

**Implementation:**
```typescript
// In BookingsService.create() and cancel()
const availabilityKey = getFlightAvailabilityCacheKey(flightId);
await this.redisService.del(availabilityKey);
```

### 3. Booking Lock Management

**Not manually invalidated:**
- Locks automatically expire after TTL (30 seconds)
- Manually released after booking transaction completes
- No manual invalidation needed (locks are temporary by nature)

### 4. Dashboard Cache Invalidation

**User Dashboard:**
- Invalidated when user bookings are created/cancelled
- Key: `dashboard:user:{userId}`

**Provider Dashboard:**
- Invalidated when provider flights are created/updated/cancelled
- Invalidated when bookings for provider's flights are created/cancelled
- Key: `dashboard:provider:{providerId}`

### 5. Large Data Cache Invalidation

**Flights by Provider:**
- Invalidated when provider flights are created/updated/cancelled
- Key: `flights:provider:{providerId}`

**Bookings by User:**
- Invalidated when user bookings are created/cancelled
- Key: `bookings:user:{userId}`

**Flight Bookings List:**
- Invalidated when bookings for the flight are created/cancelled
- Key: `flight:bookings:{flightId}`

**Flight Passengers List:**
- Invalidated when bookings for the flight are created/cancelled
- Key: `flight:passengers:{flightId}`

## Implementation Details

### RedisService Enhancements

The `RedisService` has been enhanced with the following methods:

```typescript
// JSON caching methods
async getJSON<T>(key: string): Promise<T | null>
async setJSON(key: string, value: any, ttl?: number): Promise<void>

// Pattern-based deletion
async deletePattern(pattern: string): Promise<number>

// Utility methods
async exists(key: string): Promise<boolean>
async getTTL(key: string): Promise<number>
```

### Flight Search Caching

**Location:** `FlightsService.search()` and `FlightsService.searchWithOpenSearch()`

**Flow:**
1. Generate cache key from search parameters
2. Check cache for existing results
3. If cache hit, return cached results
4. If cache miss, execute search (OpenSearch + database)
5. Cache results with 5-minute TTL
6. Return results

**Cache Key Generation:**
- Normalizes parameters (lowercase, trim)
- Creates deterministic hash from normalized parameters
- Ensures same search parameters always generate same key

### Seat Availability Caching

**Location:** `FlightsService.getAvailability()`

**Flow:**
1. Generate cache key from flight ID
2. Check cache for existing availability data
3. If cache hit, return cached data
4. If cache miss, fetch from database
5. Cache result with 30-second TTL
6. Return availability data

### Dashboard Caching

**Location:** `DashboardService.getUserDashboard()` and `DashboardService.getProviderDashboard()`

**Flow:**
1. Generate cache key from user/provider ID
2. Check cache for existing dashboard data
3. If cache hit, return cached data
4. If cache miss, execute expensive aggregation queries
5. Cache result with 2-minute TTL
6. Return dashboard data

### Large Data Caching

**Locations:**
- `FlightsService.findByProvider()` - All flights for authenticated provider
- `FlightsService.findByProviderId()` - All flights for a provider (public)
- `BookingsService.findAll()` - All bookings for a user
- `FlightsService.getFlightBookings()` - All bookings for a flight
- `FlightsService.getFlightPassengers()` - Passenger list for a flight

**Flow:**
1. Generate cache key from ID (provider/user/flight)
2. Check cache for existing data
3. If cache hit, return cached data
4. If cache miss, execute expensive query with joins
5. Cache result with appropriate TTL (1-3 minutes)
6. Return data

### Booking Lock Implementation

**Location:** `BookingsService.create()` and `BookingsService.cancel()`

**Flow:**
1. Generate lock key from flight ID
2. Attempt to acquire lock with 30-second TTL
3. If lock acquired, proceed with transaction
4. After transaction completes, release lock
5. If lock not acquired, return error to user

**Lock Key:** `lock:booking:flight:{flightId}`

## Cache Key Examples

### Flight Search Cache Keys

```
flight:search:a1b2c3d4  # Search: NYC -> LA, 2024-12-25, page 1
flight:search:e5f6g7h8  # Search: NYC -> LA, 2024-12-25, page 2
flight:search:i9j0k1l2  # Search: NYC -> Chicago, 2024-12-25
```

### Flight Availability Cache Keys

```
flight:availability:550e8400-e29b-41d4-a716-446655440000
flight:availability:550e8400-e29b-41d4-a716-446655440001
```

### Booking Lock Keys

```
lock:booking:flight:550e8400-e29b-41d4-a716-446655440000
lock:booking:flight:550e8400-e29b-41d4-a716-446655440001
```

### Dashboard Cache Keys

```
dashboard:user:550e8400-e29b-41d4-a716-446655440000
dashboard:provider:550e8400-e29b-41d4-a716-446655440001
```

### Large Data Cache Keys

```
flights:provider:550e8400-e29b-41d4-a716-446655440000
bookings:user:550e8400-e29b-41d4-a716-446655440001
flight:bookings:550e8400-e29b-41d4-a716-446655440002
flight:passengers:550e8400-e29b-41d4-a716-446655440002
```

## Performance Considerations

### Cache Hit Rates

- **Flight Search:** Expected hit rate: 60-80% (users often search similar routes)
- **Seat Availability:** Expected hit rate: 40-60% (users check availability multiple times)
- **Dashboard Stats:** Expected hit rate: 70-90% (users/providers check dashboards frequently)
- **Large Data Fetches:** Expected hit rate: 50-70% (repeated access to same data)
- **Booking Locks:** Not applicable (locks are temporary, not cached)

### Cache Size Management

- Redis automatically evicts expired keys (TTL-based expiration)
- No manual cache size limits needed
- Monitor Redis memory usage in production

### Cache Warming

Currently, caches are populated on-demand (lazy loading). For production optimization, consider:
- Pre-warming popular search queries
- Pre-warming availability for popular flights
- Scheduled cache refresh for high-traffic routes

## Monitoring and Debugging

### Cache Metrics to Monitor

1. **Cache Hit Rate:** Percentage of requests served from cache
2. **Cache Miss Rate:** Percentage of requests requiring database/OpenSearch
3. **Average Response Time:** Compare cached vs non-cached responses
4. **Redis Memory Usage:** Monitor memory consumption
5. **Lock Contention:** Number of failed lock acquisitions

### Debugging Cache Issues

1. **Check cache keys:** Use `redis-cli KEYS "flight:*"` to see active cache keys
2. **Check TTL:** Use `redis-cli TTL "flight:search:..."` to see remaining time
3. **Check lock status:** Use `redis-cli GET "lock:booking:flight:..."` to see active locks
4. **Monitor invalidation:** Check logs for cache invalidation calls

## Best Practices

1. **Always use cache key utilities:** Don't manually construct cache keys
2. **Invalidate on writes:** Always invalidate relevant caches when data changes
3. **Use appropriate TTLs:** Balance freshness with performance
4. **Handle cache failures gracefully:** Fall back to database if Redis is unavailable
5. **Monitor cache performance:** Track hit rates and adjust TTLs as needed

## Future Enhancements

Potential improvements for the caching system:

1. **Cache Warming:** Pre-populate caches for popular queries
2. **Cache Compression:** Compress large cache values to save memory
3. **Cache Versioning:** Add version numbers to cache keys for easier invalidation
4. **Distributed Cache:** Use Redis Cluster for high availability
5. **Cache Analytics:** Add detailed metrics and analytics dashboard
6. **Smart Invalidation:** Only invalidate affected cache entries instead of all

