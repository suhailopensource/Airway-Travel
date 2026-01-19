# Airway Management System - Complete Documentation

## System Overview

A comprehensive **multi-tenant airline management platform** that enables:
- **Airlines (AIRWAY_PROVIDER)** to create and manage flights, view bookings, and track passengers
- **Passengers (USER)** to search for flights, make bookings, and manage their travel

### Technology Stack

- **Backend**: NestJS REST API (TypeScript)
- **Frontend**: React + TypeScript (Vite)
- **Database**: PostgreSQL with Sequelize ORM
- **Cache & Distributed Locks**: Redis
- **Search Engine**: OpenSearch (with fuzzy matching)
- **Authentication**: Session-based (Passport.js + express-session)

---

## Core Features

### 1. Authentication & Authorization

#### Session-Based Authentication
- Uses `express-session` with Passport.js
- Session cookie: `connect.sid` (HttpOnly, Secure in production)
- Session duration: 24 hours
- Auto-login after registration

#### Two User Roles

**1. USER (Passengers)**
- Search and book flights
- View and cancel own bookings
- Access user dashboard
- Cannot create or manage flights

**2. AIRWAY_PROVIDER (Airlines)**
- Create and manage flights
- View bookings and passenger lists
- Access provider dashboard
- Mark boarding status
- Cannot create bookings

#### Security Features
- Password hashing with bcrypt (salt factor 10)
- Role-based guards (`RolesGuard`)
- Session guards (`SessionAuthGuard`)
- Ownership verification (providers only see their flights)

---

### 2. Flight Management

#### Flight Lifecycle

**Status Flow:**
```
SCHEDULED → IN_AIR → COMPLETED
     ↓
CANCELLED (terminal state)
```

**Automatic Status Transitions** (every 5 minutes):
- `SCHEDULED` → `IN_AIR` when `departureTime <= now`
- `IN_AIR` → `COMPLETED` when `arrivalTime <= now`
- On `COMPLETED`: `availableSeats` resets to `totalSeats`

#### Flight Creation (AIRWAY_PROVIDER only)

**Validations:**
- Departure time must be in the future
- Arrival time must be after departure
- `totalSeats > 0`
- **Scheduling Conflict Detection:**
  - Same flight number + same provider
  - Overlapping time windows
  - Prevents double-booking of aircraft/crew

**Conflict Detection Logic:**
```typescript
// Two flights overlap if:
// dep2 < arr1 AND arr2 > dep1
```

#### Flight Search

**Features:**
- OpenSearch integration with fuzzy matching (handles typos)
- Filters: source, destination, departure date, provider name, flight number
- Pagination support
- Fallback to database if OpenSearch fails
- Only shows `SCHEDULED` flights with `availableSeats > 0`

#### Flight Operations

- **Update**: Only owner can update, not `COMPLETED`/`IN_AIR`/`CANCELLED`
- **Cancel**: Only before departure, cancels all `CONFIRMED` bookings, restores seats
- **Real-time Availability**: Cached for 30 seconds

---

### 3. Booking Management

#### Booking Creation (USER only)

**Multi-Layer Concurrency Control:**

1. **Redis Distributed Lock**
   - Prevents concurrent booking attempts on same flight
   - TTL: 10 seconds
   - Key: `lock:booking:{flightId}`

2. **Database Transaction**
   - `SELECT ... FOR UPDATE` locks flight row
   - Atomic seat deduction
   - All-or-nothing operation

3. **Validations:**
   - `seatCount > 0`
   - Flight exists and is bookable
   - `availableSeats >= seatCount`
   - Cannot book after departure
   - Flight status must be `SCHEDULED`

4. **Booking Record:**
   - Stores provider info (id, name, email) for history
   - Calculates `totalPrice = flight.price * seatCount`
   - Status: `CONFIRMED`

#### Booking Cancellation (USER only)

- Only before departure
- Uses Redis lock + transaction
- Restores seats to flight
- Status: `CANCELLED` (record preserved)

#### Booking Statuses

- `CONFIRMED`: Active booking
- `CANCELLED`: Cancelled by user
- `BOARDED`: Marked by provider during boarding
- `NOT_BOARDED`: Auto-updated if flight departed and still `CONFIRMED`

#### Auto-Status Updates (Every 5 minutes)

Updates `CONFIRMED` bookings to `NOT_BOARDED` if:
- Flight `departureTime` has passed
- Booking is still `CONFIRMED`

**Note:** Never auto-marks as `BOARDED` (manual only)

#### Boarding Management (AIRWAY_PROVIDER only)

- Mark bookings as `BOARDED` or `NOT_BOARDED`
- Only for own flights
- Only `CONFIRMED` bookings
- Only within boarding window (45 minutes before departure)
- Users cannot self-mark

---

### 4. Search & Discovery

#### OpenSearch Integration

- Real-time indexing on flight create/update
- Fuzzy matching for cities (e.g., "New Yrok" → "New York")
- Multi-criteria search
- Fast full-text search

#### Search Features

- **Source/Destination**: Fuzzy matching
- **Provider Name**: Fuzzy matching
- **Flight Number**: Exact match
- **Departure Date**: Date range filter
- **Pagination**: Page + limit
- **Results**: Only active flights with available seats

#### Caching

- Search results cached (TTL: 5 minutes)
- Cache invalidation on flight create/update/cancel
- Pattern-based invalidation for search caches

---

### 5. Dashboard & Analytics

#### User Dashboard (USER role)

- Total bookings count
- Upcoming flights (sorted by departure)
- Past flights
- Booking status per flight

#### Provider Dashboard (AIRWAY_PROVIDER role)

- Total flights
- Total seat capacity
- Total booked seats
- Per-flight boarding info:
  - Flight details
  - Total seats
  - Booked seats
  - Available seats

#### Caching

- Dashboards cached (TTL: 2 minutes)
- Invalidated on booking/flight changes

---

### 6. Passenger Management

#### Passenger List (AIRWAY_PROVIDER only)

**Aggregated by User ID:**
- Name, email
- Total seats booked
- Total amount paid
- Booking count
- First booking date
- Status (if all bookings have same status)

**Flight Totals:**
- Total passengers
- Total seats booked
- Total revenue

**Filtering:**
- Excludes passengers with only cancelled bookings
- Counts only non-cancelled bookings in totals

---

## Data Models & Relationships

### User Entity

```
- id (UUID, PK)
- email (unique)
- password (hashed)
- name
- role (USER | AIRWAY_PROVIDER)
- createdAt, updatedAt
```

**Relationships:**
- `HasMany` Bookings (as passenger)
- `HasMany` Flights (as provider)

### Flight Entity

```
- id (UUID, PK)
- flightNumber
- providerId (FK → User)
- source
- destination
- departureTime
- arrivalTime
- totalSeats
- availableSeats
- price
- status (SCHEDULED | IN_AIR | COMPLETED | CANCELLED)
- createdAt, updatedAt
```

**Relationships:**
- `BelongsTo` User (provider)
- `HasMany` Bookings

### Booking Entity

```
- id (UUID, PK)
- userId (FK → User)
- flightId (FK → Flight)
- providerId (FK → User, denormalized)
- providerName (denormalized)
- providerEmail (denormalized)
- seatCount
- status (CONFIRMED | CANCELLED | BOARDED | NOT_BOARDED)
- totalPrice
- bookedAt
- createdAt, updatedAt
```

**Relationships:**
- `BelongsTo` User (passenger)
- `BelongsTo` Flight
- `BelongsTo` User (provider, denormalized)

---

## Business Logic & Rules

### Booking Rules

1. Cannot book if `availableSeats = 0`
2. Cannot book after departure time
3. Cannot book cancelled/in-air/completed flights
4. `seatCount` must be > 0
5. Cannot book more seats than available
6. Cannot cancel after departure

### Flight Rules

1. Cannot create flight with past departure time
2. Arrival must be after departure
3. Cannot have scheduling conflicts (same flight number + provider + overlapping times)
4. Cannot update `COMPLETED`/`IN_AIR`/`CANCELLED` flights
5. Cannot cancel after departure
6. Flight cancellation cancels all `CONFIRMED` bookings

### Time-Based Rules

1. **Booking Window**: Before departure only
2. **Cancellation Window**: Before departure only
3. **Boarding Window**: 45 minutes before departure
4. **Flight Status Transitions**: Automatic based on time

### Ownership Rules

1. Providers can only manage their own flights
2. Users can only manage their own bookings
3. Providers can only view bookings for their flights
4. Providers can only mark boarding for their flights

---

## Technical Architecture

### Concurrency Control

**1. Redis Distributed Locks**
- Prevents race conditions across instances
- TTL prevents deadlocks
- Used for booking operations

**2. Database Transactions**
- ACID guarantees
- `SELECT ... FOR UPDATE` for row-level locking
- Atomic seat updates

**3. Optimistic Locking**
- Status checks before updates
- Double-check patterns in bulk operations

### Caching Strategy

**Redis Caching for:**
- Flight search results
- Flight availability
- User bookings
- Provider flights
- Dashboard data
- Passenger lists

**Cache Invalidation:**
- Pattern-based deletion
- Event-driven (on create/update/delete)
- TTL-based expiration

### Scheduled Tasks

**1. Flight Status Updates** (every 5 minutes)
- `SCHEDULED` → `IN_AIR`
- `IN_AIR` → `COMPLETED`
- Reset seats on completion

**2. Booking Status Updates** (every 5 minutes)
- `CONFIRMED` → `NOT_BOARDED` (if flight departed)

### Error Handling

- Custom business exceptions
- Transaction rollback on errors
- Graceful degradation (OpenSearch fallback)
- Scheduler error handling (non-blocking)

---

## Frontend Architecture

### React Structure

**Pages:**
- **Auth**: Login, Register
- **Public**: Flight Search, Flight Details
- **User**: Dashboard, Bookings, Create Booking
- **Provider**: Dashboard, Flights, Create Flight, Bookings, Passenger List

### State Management

- **AuthContext**: Session-based auth state
- **Axios Interceptors**: Auto-redirect on 401
- **withCredentials: true**: For session cookies

### Routing

- Protected routes based on role
- Auto-redirect to login on unauthorized

---

## Security Features

### 1. Session Security
- HttpOnly cookies
- Secure flag in production
- SameSite: `lax`
- 24-hour expiration

### 2. Password Security
- bcrypt hashing (salt factor 10)
- Never stored in plain text
- Never returned in API responses

### 3. Authorization
- Role-based access control
- Ownership verification
- Guard-based route protection

### 4. Input Validation
- DTO validation (class-validator)
- SQL injection prevention (ORM)
- XSS prevention (input sanitization)

---

## Performance Optimizations

### 1. Caching
- Redis for frequently accessed data
- TTL-based expiration
- Pattern-based invalidation

### 2. Database
- Indexed foreign keys
- Efficient queries with includes
- Connection pooling

### 3. Search
- OpenSearch for fast full-text search
- Database fallback
- Cached search results

### 4. Concurrency
- Distributed locks prevent race conditions
- Transaction isolation
- Optimistic locking where appropriate

---

## API Endpoints Summary

### Authentication
- `POST /auth/register` - Register (auto-login)
- `POST /auth/login` - Login (creates session)
- `POST /auth/logout` - Logout (destroys session)
- `GET /auth/me` - Get current user

### Flights (Public)
- `GET /flights/search` - Search flights (OpenSearch)
- `GET /flights/:id` - Get flight details
- `GET /flights/:id/availability` - Get seat availability
- `GET /flights/provider/:providerId` - Get flights by provider

### Flights (Provider)
- `POST /flights` - Create flight
- `GET /flights/my` - Get provider's flights
- `PATCH /flights/:id` - Update flight
- `DELETE /flights/:id` - Cancel flight
- `GET /flights/:id/bookings` - Get flight bookings
- `GET /flights/:id/passengers` - Get passenger list

### Bookings (User)
- `POST /bookings` - Create booking
- `GET /bookings/my` - Get user's bookings
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/cancel` - Cancel booking

### Bookings (Provider)
- `PATCH /bookings/:id/board` - Mark boarding status

### Dashboard
- `GET /dashboard/user` - User dashboard
- `GET /dashboard/provider` - Provider dashboard

---

## Session Authentication Flow

### 1. Session Configuration (`main.ts`)

Session middleware configured with:
- Cookie name: `connect.sid`
- Max age: 24 hours
- HttpOnly: Prevents JavaScript access
- Secure: Enabled in production (HTTPS)
- SameSite: `lax` for CSRF protection

### 2. Passport Initialization

Passport initialized with session support:
- `passport.initialize()` - Initializes Passport
- `passport.session()` - Enables session support
- `serializeUser`: Stores only user ID in session
- `deserializeUser`: Fetches full user from database on each request

### 3. Login Flow

1. `LocalAuthGuard` triggers `LocalStrategy`
2. `LocalStrategy` validates email/password
3. On success, `req.user` is set
4. `req.login()` serializes user ID into session
5. Session cookie sent to client

### 4. Protecting Routes

- `SessionAuthGuard` checks `req.user`
- `passport.session()` middleware runs before guard
- Deserializes user from session cookie
- If `req.user` exists, access granted
- Otherwise, throws `UnauthorizedException`

### 5. Getting Current User

- `/auth/me` endpoint uses `@CurrentUser()` decorator
- Extracts `req.user` from request
- Returns authenticated user information

### 6. Logout

- `req.session.destroy()` removes session
- Session cookie invalidated
- User logged out

### 7. Frontend Integration

- Axios configured with `withCredentials: true`
- Ensures session cookie sent with requests
- Auto-redirect on 401 errors

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL
- Redis
- OpenSearch

### Backend Setup

```bash
cd airway
npm install
cp .env.example .env  # Configure environment variables
docker-compose up -d  # Start PostgreSQL, Redis, OpenSearch
npm run start:dev
```

### Frontend Setup

```bash
cd frontend-twigs
npm install
npm run dev
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=airway_user
DB_PASSWORD=airway_password
DB_DATABASE=airway_db

# Session
SESSION_SECRET=your-secret-key-change-in-production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenSearch
OPENSEARCH_NODE=http://localhost:9200

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## Project Structure

```
airway-final/
├── airway/                 # Backend (NestJS)
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── flights/       # Flight management
│   │   ├── bookings/     # Booking management
│   │   ├── dashboard/    # Dashboard APIs
│   │   ├── common/        # Shared utilities, guards, decorators
│   │   ├── database/      # Database configuration
│   │   ├── redis/         # Redis service
│   │   └── opensearch/    # OpenSearch service
│   └── package.json
│
└── frontend-twigs/         # Frontend (React)
    ├── src/
    │   ├── api/           # API clients
    │   ├── auth/          # Auth context & protected routes
    │   ├── components/    # Reusable components
    │   ├── pages/         # Page components
    │   ├── types/         # TypeScript types
    │   └── utils/         # Utility functions
    └── package.json
```

---

## Summary

This system provides:

✅ **Multi-tenant airline marketplace**  
✅ **Real-time seat availability**  
✅ **Concurrency-safe booking system**  
✅ **Advanced search with fuzzy matching**  
✅ **Automated flight lifecycle management**  
✅ **Role-based access control**  
✅ **Caching for performance**  
✅ **Scheduled tasks for status updates**  
✅ **Session-based authentication**  
✅ **Dashboard analytics**

The architecture supports **scalability**, **data consistency**, and **security** while maintaining clear separation between passengers (users) and airlines (providers).

---

## License

MIT

