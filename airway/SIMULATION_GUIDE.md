# Concurrent Booking Simulation Guide

## Overview

The `simulate-concurrent-bookings.js` script simulates multiple users trying to book the same flight simultaneously. This helps test the concurrency control system.

## Scenario

- **11 users** try to book the same flight
- Each user tries to book **10 seats**
- Flight has **100 total seats**
- **Expected result**: 10 bookings succeed, 1 fails (100 seats ÷ 10 seats per booking = 10 bookings)

## Prerequisites

1. **Backend server running**: `npm run start:dev`
2. **Database running**: `docker compose up -d postgres`
3. **Redis running**: `docker compose up -d redis`

## Quick Start

### Option 1: Use Default Configuration (Recommended)

The script will automatically:
- Create a test flight with 100 seats
- Register 11 test users
- Simulate concurrent bookings

```bash
cd airway
node simulate-concurrent-bookings.js
```

Or use npm script:
```bash
npm run test:concurrent-bookings
```

### Option 2: Use Existing Flight

If you want to test with an existing flight:

```bash
# Set the flight ID
FLIGHT_ID="your-flight-uuid-here" node simulate-concurrent-bookings.js
```

### Option 3: Customize Configuration

Edit the `CONFIG` section in `simulate-concurrent-bookings.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  FLIGHT_ID: null,              // null = create test flight, or provide UUID
  NUM_USERS: 11,                // Number of users
  SEATS_PER_USER: 10,           // Seats each user tries to book
  FLIGHT_TOTAL_SEATS: 100,      // Total seats in test flight
  PROVIDER_EMAIL: 'provider@test.com',
  PROVIDER_PASSWORD: 'provider123',
  PROVIDER_NAME: 'Test Airline',
};
```

Or use environment variables:

```bash
NUM_USERS=20 \
SEATS_PER_USER=5 \
FLIGHT_TOTAL_SEATS=100 \
node simulate-concurrent-bookings.js
```

## What the Script Does

### Step 1: Create Test Flight (if FLIGHT_ID not provided)

- Registers/logs in as a provider
- Creates a flight with:
  - Flight Number: `TEST-001`
  - Source: `New York`
  - Destination: `Los Angeles`
  - Departure: Tomorrow at 10:00 AM
  - Total Seats: 100 (or configured value)
  - Price: $299.99

### Step 2: Register/Login Users

- Creates 11 users (or configured number):
  - Email: `user1@test.com`, `user2@test.com`, etc.
  - Password: `password1`, `password2`, etc.
  - Name: `Test User 1`, `Test User 2`, etc.
  - Role: `USER`

- Each user gets their own session (cookie)

### Step 3: Check Initial Availability

- Queries flight availability before bookings
- Shows total, available, and booked seats

### Step 4: Simulate Concurrent Bookings

- **All 11 users try to book simultaneously**
- Each user tries to book 10 seats
- Requests are sent at the same time (truly concurrent)

### Step 5: Display Results

- Shows which bookings succeeded
- Shows which bookings failed
- Displays statistics:
  - Total requests
  - Success/failure counts
  - Duration metrics
  - Verification of no overbooking

## Expected Output

```
🚀 Starting Concurrent Booking Simulation

================================================================================
Configuration:
  API URL: http://localhost:3000
  Number of Users: 11
  Seats per User: 10
  Total Seats Needed: 110
  Flight Total Seats: 100
  Expected Successful Bookings: 10
  Expected Failed Bookings: 1
================================================================================

📝 Step 1: Creating test flight...
✅ Test flight created: 550e8400-e29b-41d4-a716-446655440000
   Flight has 100 total seats

👥 Step 2: Registering/Logging in 11 users...
✅ 11 users ready for booking

📊 Step 3: Checking initial flight availability...
   Total Seats: 100
   Available Seats: 100
   Booked Seats: 0

🎫 Step 4: Simulating 11 concurrent booking requests...
   Each user trying to book 10 seats

================================================================================
📊 RESULTS
================================================================================

✅ Successful Bookings: 10
   ✅ User 1 booked 10 seats successfully (245ms)
   ✅ User 2 booked 10 seats successfully (312ms)
   ✅ User 3 booked 10 seats successfully (389ms)
   ...
   ✅ User 10 booked 10 seats successfully (1023ms)

❌ Failed Bookings: 1
   ❌ User 11 failed: No seats available. Flight is fully booked. (1156ms)

================================================================================
📈 Statistics:
   Total Requests: 11
   Successful: 10 (90.9%)
   Failed: 1 (9.1%)
   Total Duration: 1156ms
   Average Duration: 523ms
   Fastest: 245ms
   Slowest: 1156ms
================================================================================

📊 Step 5: Checking final flight availability...
   Total Seats: 100
   Available Seats: 0
   Booked Seats: 100
   Status: SCHEDULED

✅ Verification: No overbooking! Booked seats match expected (100)

✅ Simulation complete!
```

## Configuration Options

### Environment Variables

You can override any configuration using environment variables:

```bash
# Custom API URL
API_BASE_URL="http://localhost:3000" node simulate-concurrent-bookings.js

# Use existing flight
FLIGHT_ID="550e8400-e29b-41d4-a716-446655440000" node simulate-concurrent-bookings.js

# Custom scenario: 20 users, 5 seats each, 100 total seats
NUM_USERS=20 \
SEATS_PER_USER=5 \
FLIGHT_TOTAL_SEATS=100 \
node simulate-concurrent-bookings.js

# Test with more seats than available
NUM_USERS=15 \
SEATS_PER_USER=10 \
FLIGHT_TOTAL_SEATS=100 \
node simulate-concurrent-bookings.js
# Expected: 10 succeed, 5 fail
```

### In the Script

Edit the `CONFIG` object at the top of `simulate-concurrent-bookings.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',  // Your backend URL
  FLIGHT_ID: null,                         // null = auto-create, or UUID
  NUM_USERS: 11,                           // Number of concurrent users
  SEATS_PER_USER: 10,                      // Seats per booking
  FLIGHT_TOTAL_SEATS: 100,                 // Total seats in flight
  PROVIDER_EMAIL: 'provider@test.com',     // Provider email for test flight
  PROVIDER_PASSWORD: 'provider123',        // Provider password
  PROVIDER_NAME: 'Test Airline',           // Provider name
};
```

## What to Configure

### 1. API Base URL

**Default**: `http://localhost:3000`

**If your backend runs on different port:**
```javascript
API_BASE_URL: 'http://localhost:4000'
```

**Or via environment:**
```bash
API_BASE_URL="http://localhost:4000" node simulate-concurrent-bookings.js
```

### 2. Flight ID

**Option A: Auto-create test flight (default)**
```javascript
FLIGHT_ID: null  // Script creates a test flight
```

**Option B: Use existing flight**
```javascript
FLIGHT_ID: '550e8400-e29b-41d4-a716-446655440000'
```

**Or via environment:**
```bash
FLIGHT_ID="your-flight-uuid" node simulate-concurrent-bookings.js
```

### 3. Number of Users

**Default**: 11 users

**Change in script:**
```javascript
NUM_USERS: 20  // 20 concurrent users
```

**Or via environment:**
```bash
NUM_USERS=20 node simulate-concurrent-bookings.js
```

### 4. Seats per User

**Default**: 10 seats per user

**Change in script:**
```javascript
SEATS_PER_USER: 5  // Each user books 5 seats
```

**Or via environment:**
```bash
SEATS_PER_USER=5 node simulate-concurrent-bookings.js
```

### 5. Flight Total Seats

**Default**: 100 seats

**Change in script:**
```javascript
FLIGHT_TOTAL_SEATS: 50  // Flight has 50 seats
```

**Or via environment:**
```bash
FLIGHT_TOTAL_SEATS=50 node simulate-concurrent-bookings.js
```

### 6. Provider Credentials (for test flight creation)

**Default**:
- Email: `provider@test.com`
- Password: `provider123`
- Name: `Test Airline`

**Change in script:**
```javascript
PROVIDER_EMAIL: 'myprovider@example.com',
PROVIDER_PASSWORD: 'mypassword',
PROVIDER_NAME: 'My Airline',
```

**Or via environment:**
```bash
PROVIDER_EMAIL="myprovider@example.com" \
PROVIDER_PASSWORD="mypassword" \
PROVIDER_NAME="My Airline" \
node simulate-concurrent-bookings.js
```

## Understanding the Results

### Successful Bookings

✅ **What it means**: User successfully booked seats
- Booking was created
- Seats were deducted from flight
- User received confirmation

### Failed Bookings

❌ **Common reasons**:
1. **"No seats available"**: All seats were booked by previous requests
2. **"Insufficient seats"**: Requested more seats than available
3. **"Flight not found"**: Invalid flight ID
4. **"Booking not allowed after departure"**: Flight already departed

### Statistics

- **Total Duration**: Time from first request to last response
- **Average Duration**: Average time per booking request
- **Fastest/Slowest**: Performance metrics

### Verification

The script verifies:
- ✅ No overbooking occurred
- ✅ Booked seats match expected count
- ✅ Available seats are correct

## Testing Different Scenarios

### Scenario 1: Exact Match
```bash
NUM_USERS=10 SEATS_PER_USER=10 FLIGHT_TOTAL_SEATS=100
# Expected: All 10 succeed
```

### Scenario 2: One Extra User
```bash
NUM_USERS=11 SEATS_PER_USER=10 FLIGHT_TOTAL_SEATS=100
# Expected: 10 succeed, 1 fails
```

### Scenario 3: Many Small Bookings
```bash
NUM_USERS=50 SEATS_PER_USER=2 FLIGHT_TOTAL_SEATS=100
# Expected: 50 succeed (50 × 2 = 100 seats)
```

### Scenario 4: Large Bookings
```bash
NUM_USERS=5 SEATS_PER_USER=25 FLIGHT_TOTAL_SEATS=100
# Expected: 4 succeed (4 × 25 = 100), 1 fails
```

## Troubleshooting

### Error: "Cannot connect to API"

**Solution**: Make sure backend is running
```bash
npm run start:dev
```

### Error: "Flight not found"

**Solution**: 
- Check FLIGHT_ID is correct UUID
- Or set FLIGHT_ID to `null` to auto-create

### Error: "Provider already exists"

**Solution**: This is fine - script will login instead of register

### Error: "User already exists"

**Solution**: This is fine - script will login instead of register

### All bookings fail

**Check**:
1. Flight has available seats
2. Flight status is SCHEDULED
3. Flight departure time is in the future
4. Backend is running and healthy

## Advanced Usage

### Run Multiple Times

```bash
# First run
node simulate-concurrent-bookings.js

# Second run (uses same users, creates new flight)
node simulate-concurrent-bookings.js
```

### Test with Real Flight

1. Create a flight via API or frontend
2. Get the flight ID
3. Run simulation:
```bash
FLIGHT_ID="your-flight-uuid" node simulate-concurrent-bookings.js
```

### Monitor in Real-Time

Watch backend logs while simulation runs:
```bash
# Terminal 1: Run simulation
node simulate-concurrent-bookings.js

# Terminal 2: Watch backend logs
npm run start:dev
```

## What This Proves

✅ **Concurrency Control Works**:
- Multiple bookings proceed in parallel
- No overbooking occurs
- Exactly the right number succeed

✅ **Database Locking Works**:
- `SELECT ... FOR UPDATE` serializes updates
- Each transaction sees fresh data
- Atomic seat deduction

✅ **User Experience**:
- Users don't see artificial blocking
- Only fail when seats actually run out
- Fast parallel processing

## Next Steps

1. Run the simulation
2. Observe the results
3. Verify no overbooking
4. Check performance metrics
5. Test different scenarios

Happy testing! 🚀

