# How Backend Handles Concurrent Bookings

## Overview

When multiple users try to book the same flight simultaneously (like in `simulate-concurrent-bookings.js`), the backend uses **PostgreSQL's row-level locking** (`SELECT ... FOR UPDATE`) to ensure:
- ✅ No overbooking occurs
- ✅ Multiple bookings can proceed in parallel when seats are available
- ✅ Only fails when seats actually run out
- ✅ Atomic seat check and update

## Architecture: Database-Level Concurrency Control

The backend **does NOT use Redis locks** for booking concurrency. Instead, it relies on PostgreSQL's built-in transaction isolation and row-level locking.

### Key Component: `SELECT ... FOR UPDATE`

```sql
-- What happens in the database
BEGIN TRANSACTION;
SELECT * FROM flights WHERE id = 'flight-123' FOR UPDATE;
-- ↑ This locks the row exclusively
-- Other transactions must wait until this one commits
-- ... perform checks and updates ...
COMMIT; -- Releases the lock
```

## Step-by-Step: How a Booking Request is Processed

### 1. Request Arrives

```typescript
// User makes booking request
POST /bookings
{
  "flightId": "550e8400-e29b-41d4-a716-446655440000",
  "seatCount": 10
}
```

### 2. Service Method: `BookingsService.create()`

**Location**: `airway/src/bookings/bookings.service.ts:40-138`

```typescript
async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
  const { flightId, seatCount } = createBookingDto;

  // Start database transaction
  const transaction = await this.bookingModel.sequelize.transaction();

  try {
    // STEP 1: Lock the flight row
    const flight = await this.flightModel.findByPk(flightId, {
      lock: true, // ← SELECT ... FOR UPDATE
      transaction,
    });

    // STEP 2: Validate flight exists
    if (!flight) {
      throw new NotFoundException(`Flight with ID ${flightId} not found`);
    }

    // STEP 3: Check time (cannot book after departure)
    const now = this.timeValidationService.getCurrentTime();
    if (now >= flight.departureTime) {
      throw new BadRequestException('Booking is not allowed after flight departure.');
    }

    // STEP 4: Validate flight status
    this.timeValidationService.validateFlightBookable(flight);

    // STEP 5: Atomic seat availability check
    if (flight.availableSeats === 0) {
      throw new BadRequestException('No seats available. Flight is fully booked.');
    }

    // STEP 6: Validate seat count
    if (flight.availableSeats < seatCount) {
      throw new InsufficientSeatsException(flight.availableSeats, seatCount);
    }

    // STEP 7: Calculate price
    const totalPrice = flight.price * seatCount;

    // STEP 8: Get provider info
    const provider = await this.userModel.findByPk(flight.providerId, {
      attributes: ['id', 'name', 'email'],
      transaction,
    });

    // STEP 9: Create booking record
    const booking = await this.bookingModel.create(
      {
        userId,
        flightId,
        providerId: provider.id,
        providerName: provider.name,
        providerEmail: provider.email,
        seatCount,
        totalPrice,
        status: BookingStatus.CONFIRMED,
        bookedAt: new Date(),
      },
      { transaction },
    );

    // STEP 10: Update flight seats atomically
    await flight.update(
      {
        availableSeats: flight.availableSeats - seatCount,
      },
      { transaction },
    );

    // STEP 11: Commit transaction (releases lock)
    await transaction.commit();

    // STEP 12: Invalidate caches
    await this.invalidateBookingRelatedCaches(userId, flightId, flight.providerId);

    return booking;
  } catch (error) {
    // Rollback on any error
    await transaction.rollback();
    throw error;
  }
}
```

## Concurrent Booking Scenario: 11 Users, 10 Seats Each, 100 Total Seats

### Initial State
- **Flight**: `TEST-001`
- **Total Seats**: 100
- **Available Seats**: 100
- **11 users** try to book **10 seats each** simultaneously

### Timeline of Events

```
Time T0: All 11 requests arrive at backend simultaneously
    ↓
Time T1: All 11 transactions start in parallel
    ├─ Transaction 1: BEGIN → SELECT ... FOR UPDATE (locks row)
    ├─ Transaction 2: BEGIN → SELECT ... FOR UPDATE (waits for T1)
    ├─ Transaction 3: BEGIN → SELECT ... FOR UPDATE (waits in queue)
    ├─ Transaction 4: BEGIN → SELECT ... FOR UPDATE (waits in queue)
    ├─ ...
    └─ Transaction 11: BEGIN → SELECT ... FOR UPDATE (waits in queue)
    ↓
Time T2: Transaction 1 proceeds (has lock)
    ├─ Reads: availableSeats = 100
    ├─ Checks: 100 >= 10 ✅
    ├─ Creates booking (10 seats)
    ├─ Updates: availableSeats = 90
    ├─ COMMIT (releases lock)
    ↓
Time T3: Transaction 2 proceeds (lock released)
    ├─ SELECT ... FOR UPDATE (locks row, reads: 90 seats - fresh!)
    ├─ Checks: 90 >= 10 ✅
    ├─ Creates booking (10 seats)
    ├─ Updates: availableSeats = 80
    ├─ COMMIT
    ↓
Time T4: Transaction 3 proceeds
    ├─ Reads: 80 seats
    ├─ Checks: 80 >= 10 ✅
    ├─ Creates booking (10 seats)
    ├─ Updates: availableSeats = 70
    ├─ COMMIT
    ↓
... (Transactions 4-10 proceed similarly)
    ↓
Time T11: Transaction 10 proceeds
    ├─ Reads: 10 seats
    ├─ Checks: 10 >= 10 ✅
    ├─ Creates booking (10 seats)
    ├─ Updates: availableSeats = 0
    ├─ COMMIT
    ↓
Time T12: Transaction 11 proceeds (last one)
    ├─ SELECT ... FOR UPDATE (locks row, reads: 0 seats)
    ├─ Checks: 0 >= 10 ❌
    ├─ Throws: BadRequestException('No seats available. Flight is fully booked.')
    ├─ ROLLBACK
    ↓
Final Result:
    ✅ 10 bookings succeed (100 seats booked)
    ❌ 1 booking fails (correctly - no seats left)
```

## How `SELECT ... FOR UPDATE` Prevents Overbooking

### What `SELECT ... FOR UPDATE` Does

1. **Exclusive Row Lock**: When a transaction executes `SELECT ... FOR UPDATE`, it acquires an exclusive lock on that row
2. **Serialization**: Other transactions trying to lock the same row must wait
3. **Fresh Data**: When a transaction gets the lock, it reads the latest committed value
4. **Atomic Operations**: Check and update happen within the same transaction

### Visual Representation

```
Request 1: ──────────────────────────────────────────────┐
           │ Lock row → Read 100 → Check → Update 90 → Commit │
           └───────────────────────────────────────────────────┘
                                                              │
Request 2: ──────────────────────────────────────────────┐   │
           │ ⏳ Wait...                                    │   │
           │ Lock row → Read 90 → Check → Update 80 → Commit │
           └───────────────────────────────────────────────────┘
                                                              │
Request 3: ──────────────────────────────────────────────┐   │
           │ ⏳ Wait...                                    │   │
           │ ⏳ Wait...                                    │   │
           │ Lock row → Read 80 → Check → Update 70 → Commit │
           └───────────────────────────────────────────────────┘
```

### Key Points

1. **Parallel Start**: All transactions start simultaneously
2. **Serialized Updates**: Database serializes row updates (one at a time)
3. **Fresh Reads**: Each transaction reads the latest value after previous commits
4. **No Race Conditions**: Lock ensures atomic check-and-update

## Code Deep Dive

### 1. Transaction Start

```typescript
const transaction: Transaction = await this.bookingModel.sequelize.transaction();
```

- Starts a new database transaction
- All operations within this transaction are atomic
- Either all succeed (commit) or all fail (rollback)

### 2. Row-Level Lock

```typescript
const flight = await this.flightModel.findByPk(flightId, {
  lock: true, // ← This is the key!
  transaction,
});
```

**What Sequelize generates**:
```sql
SELECT * FROM flights 
WHERE id = 'flight-123' 
FOR UPDATE;
```

**What PostgreSQL does**:
- Locks the row with `id = 'flight-123'` exclusively
- Other transactions must wait if they try to lock the same row
- Lock is held until transaction commits or rolls back

### 3. Atomic Check and Update

```typescript
// Check (while row is locked)
if (flight.availableSeats < seatCount) {
  throw new InsufficientSeatsException(...);
}

// Update (still within same transaction, row still locked)
await flight.update(
  { availableSeats: flight.availableSeats - seatCount },
  { transaction },
);
```

**Why this is atomic**:
- Check and update happen in the same transaction
- Row is locked during both operations
- No other transaction can modify the row between check and update
- Guarantees no overbooking

### 4. Commit (Release Lock)

```typescript
await transaction.commit();
```

- Makes all changes permanent
- Releases the row lock
- Next waiting transaction can proceed

### 5. Rollback (On Error)

```typescript
catch (error) {
  await transaction.rollback();
  throw error;
}
```

- Undoes all changes in the transaction
- Releases the row lock
- Next waiting transaction can proceed

## Why This Approach Works

### ✅ Advantages

1. **Parallel Processing**: Multiple bookings can start simultaneously
2. **Natural Serialization**: Database handles queuing automatically
3. **No Artificial Blocking**: Users don't see "currently being booked" errors
4. **Fresh Data**: Each transaction sees latest committed values
5. **Atomic Operations**: Check and update are guaranteed atomic
6. **No Overbooking**: Database guarantees consistency

### ❌ Why Not Redis Locks?

**Previous approach (removed)**:
```typescript
// ❌ Old approach - blocked all concurrent requests
const lockAcquired = await this.redisService.acquireLock(lockKey);
if (!lockAcquired) {
  throw new BadRequestException('Flight is currently being booked.');
}
```

**Problems**:
- Only one booking could proceed at a time
- Even when 50 seats available, only 1 user could book
- Poor user experience
- Sequential processing (slow)

**Current approach**:
```typescript
// ✅ New approach - allows parallel processing
const flight = await this.flightModel.findByPk(flightId, {
  lock: true, // Database handles concurrency
  transaction,
});
```

**Benefits**:
- Multiple bookings proceed in parallel
- Database serializes only when needed
- Better user experience
- Faster processing

## Real-World Example: Simulation Script

When you run `simulate-concurrent-bookings.js`:

### What Happens

1. **11 HTTP requests** sent simultaneously to `/bookings`
2. **11 transactions** start in parallel
3. **Database serializes** row updates:
   - Request 1: Locks → Reads 100 → Books → Updates 90 → Commits
   - Request 2: Waits → Locks → Reads 90 → Books → Updates 80 → Commits
   - Request 3: Waits → Locks → Reads 80 → Books → Updates 70 → Commits
   - ...
   - Request 10: Waits → Locks → Reads 10 → Books → Updates 0 → Commits
   - Request 11: Waits → Locks → Reads 0 → Fails → Rolls back

4. **Result**: 10 succeed, 1 fails (correct!)

### Expected Output

```
✅ Successful Bookings: 10
   ✅ User 1 booked 10 seats successfully (245ms)
   ✅ User 2 booked 10 seats successfully (312ms)
   ...
   ✅ User 10 booked 10 seats successfully (1023ms)

❌ Failed Bookings: 1
   ❌ User 11 failed: No seats available. Flight is fully booked. (1156ms)
```

## Performance Characteristics

### Scenario: 100 Seats, 100 Concurrent Requests

**Time Breakdown**:
- All 100 transactions start: ~0ms (parallel)
- Database serializes updates: ~100 × 10ms = 1000ms
- Total time: ~1 second

**Throughput**:
- 100 bookings in ~1 second
- ~100 bookings/second

### Scenario: 100 Seats, 200 Concurrent Requests

**Result**:
- 100 bookings succeed
- 100 bookings fail (correctly - no seats left)
- Time: ~1 second (same as above)

## Safety Guarantees

### ✅ No Overbooking

- `SELECT ... FOR UPDATE` ensures only one transaction updates the row at a time
- Each transaction reads fresh data after previous commits
- Atomic check-and-update prevents race conditions

### ✅ Data Consistency

- Transactions ensure all-or-nothing operations
- If booking creation fails, seat count is not decremented
- If seat update fails, booking is not created

### ✅ Correct Failure Cases

Bookings only fail when:
1. **No seats available**: `availableSeats = 0`
2. **Insufficient seats**: Requesting more than available
3. **Flight departed**: Cannot book after departure time
4. **Flight cancelled/invalid**: Status checks fail

Bookings **never fail** due to:
- ❌ Concurrent request blocking (removed)
- ❌ "Currently being booked" errors (removed)

## Database Transaction Isolation

PostgreSQL uses **READ COMMITTED** isolation level by default, which means:

1. **Each transaction sees only committed data**
2. **Row locks prevent concurrent modifications**
3. **No dirty reads** (reading uncommitted data)
4. **No lost updates** (updates are serialized)

This is perfect for booking scenarios!

## Comparison: Old vs New

### Old Approach (Redis Lock)

```
50 seats, 50 requests:
├─ Request 1: ✅ Acquires lock → Books → Releases lock
├─ Request 2: ❌ Lock exists → Error
├─ Request 3: ❌ Lock exists → Error
└─ ...
Result: Only 1 succeeds, 49 fail
Time: Sequential (slow)
```

### New Approach (Database Lock)

```
50 seats, 50 requests:
├─ All 50: Start transactions in parallel
├─ Database serializes row updates:
│  ├─ Request 1: ✅ Locks → Books → Commits (49 left)
│  ├─ Request 2: ✅ Waits → Locks → Books → Commits (48 left)
│  ├─ Request 3: ✅ Waits → Locks → Books → Commits (47 left)
│  └─ ...
└─ Result: All 50 succeed ✅
Time: Parallel with serialization (fast)
```

## Summary

The backend handles concurrent bookings using:

1. **PostgreSQL Transactions**: Atomic operations
2. **Row-Level Locking**: `SELECT ... FOR UPDATE` serializes updates
3. **Parallel Processing**: Multiple bookings can start simultaneously
4. **Natural Serialization**: Database queues conflicting updates
5. **Fresh Data**: Each transaction reads latest committed values
6. **No Overbooking**: Database guarantees consistency

**Key Code**: `airway/src/bookings/bookings.service.ts:40-138`

**Key Mechanism**: `SELECT ... FOR UPDATE` in PostgreSQL

**Result**: Fast, safe, and user-friendly concurrent booking system! 🚀

