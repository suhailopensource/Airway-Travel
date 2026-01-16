# Airway Management System - High-Level Architecture

## 1. High-Level System Architecture

### System Components Overview

The Airway Management System is a backend-only REST API built using NestJS that manages flights, bookings, and users. The system follows a layered architecture pattern with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                        │
│         (Web Frontend, Mobile App, API Consumers)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS Requests
                       │ (REST API)
┌──────────────────────▼──────────────────────────────────────┐
│                  NestJS Application Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Users   │  │  Flights │  │ Bookings │   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Guards &  │  │  Common  │  │ Dashboard│                 │
│  │Decorators│  │  Utils   │  │  Module  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
       │              │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ PostgreSQL  │ │   Redis   │ │ OpenSearch │ │   JWT     │
│  Database   │ │   Cache   │ │   Search   │ │  Service  │
│             │ │  & Locks  │ │   Engine   │ │           │
└─────────────┘ └───────────┘ └────────────┘ └───────────┘
```

### Data Flow Pattern

The system follows a standard request-response flow:

1. **Request Entry**: HTTP requests enter through NestJS controllers
2. **Authentication**: JWT validation happens via guards before any business logic
3. **Authorization**: Role-based guards check if user has permission
4. **Business Logic**: Services execute domain-specific operations
5. **Data Access**: Services interact with:
   - PostgreSQL for persistent data storage
   - Redis for distributed locks and caching
   - OpenSearch for flight search operations
6. **Response**: Controllers format and return JSON responses

### Component Interaction Flow

```
Client Request
    ↓
NestJS Controller (receives HTTP request)
    ↓
JWT Auth Guard (validates token)
    ↓
Roles Guard (checks permissions)
    ↓
Service Layer (business logic)
    ↓
┌─────────────────────────────────────┐
│  Data Layer (one or more):          │
│  • PostgreSQL (CRUD operations)    │
│  • Redis (locks, cache)            │
│  • OpenSearch (search queries)     │
└─────────────────────────────────────┘
    ↓
Service returns result
    ↓
Controller formats response
    ↓
Client receives JSON response
```

## 2. Technology Stack Rationale

### NestJS (TypeScript Framework)

**Why NestJS:**
- **Modular Architecture**: Built-in module system allows clean separation of concerns
- **Dependency Injection**: Makes code testable and maintainable
- **TypeScript**: Provides type safety and better developer experience
- **Decorator-based**: Clean syntax for routes, guards, and validators
- **Built-in Features**: JWT, validation, Swagger documentation out of the box
- **Scalability**: Designed for large-scale enterprise applications

### PostgreSQL (Relational Database)

**Why PostgreSQL:**
- **ACID Compliance**: Ensures data consistency for critical operations like bookings
- **Relational Model**: Perfect for structured data (users, flights, bookings with relationships)
- **Foreign Keys**: Enforces referential integrity automatically
- **Concurrent Access**: Handles multiple simultaneous bookings safely
- **Mature & Reliable**: Battle-tested for production systems

### Sequelize ORM

**Why Sequelize:**
- **TypeScript Support**: Works seamlessly with NestJS and TypeScript
- **Model-based**: Clean abstraction over raw SQL
- **Relationships**: Easy definition of foreign keys and associations
- **Transactions**: Built-in support for atomic operations
- **Migrations**: Database schema version control

### Redis (Caching & Distributed Locks)

**Why Redis:**
- **Distributed Locks**: Prevents race conditions in multi-instance deployments
- **Speed**: In-memory operations are extremely fast
- **Atomic Operations**: SET with NX/EX flags for reliable locking
- **TTL Support**: Automatic lock expiration prevents deadlocks
- **Caching**: Can also cache frequently accessed data

### OpenSearch (Search Engine)

**Why OpenSearch:**
- **Full-text Search**: Powerful search capabilities beyond SQL LIKE queries
- **Fuzzy Matching**: Handles typos in city names (e.g., "New York" matches "New Yrok")
- **Performance**: Much faster than database searches on large datasets
- **Real-time Indexing**: Updates search index immediately when flights change
- **Scalability**: Designed to handle millions of documents

### JWT (JSON Web Tokens)

**Why JWT:**
- **Stateless**: No need for server-side session storage
- **Scalable**: Works across multiple server instances
- **Self-contained**: Token includes user identity and role
- **Standard**: Widely supported and understood
- **Security**: Signed tokens prevent tampering

## 3. Overall Domain Breakdown

### Authentication Domain (Auth Module)

**Purpose**: Handles user registration, login, and token management.

**Responsibilities:**
- User registration with password hashing
- User login and credential validation
- JWT token generation
- Token validation utilities

**Key Concepts:**
- Password hashing using bcrypt
- JWT token creation with user ID, email, and role
- Token expiration management

### User Management Domain (Users Module)

**Purpose**: Manages user profiles and user-related operations.

**Responsibilities:**
- User CRUD operations
- User profile retrieval
- User booking history
- Password validation

**Key Concepts:**
- User entity with role (USER or AIRWAY_PROVIDER)
- User relationships (bookings, flights as provider)
- Profile information management

### Airway Provider Domain

**Purpose**: Represents airlines/airway providers in the system.

**Important Design Decision**: There is no separate "AirwayProvider" entity. Each AIRWAY_PROVIDER role user IS the airline itself.

**How it works:**
- Users with role `AIRWAY_PROVIDER` represent airlines (e.g., "Indigo", "Air India")
- The user's name/email identifies the airline
- Flights are directly linked to the provider user via `providerId` foreign key
- This simplifies the model: User → Flights (direct relationship)

**Responsibilities:**
- Provider identification (via user role)
- Flight ownership (all flights belong to a provider user)
- Provider-specific operations (viewing their flights, bookings, passengers)

**Key Concepts:**
- Provider = User with AIRWAY_PROVIDER role
- No separate airline entity needed
- Direct User-to-Flight relationship

### Flight Management Domain (Flights Module)

**Purpose**: Handles flight creation, management, and search.

**Responsibilities:**
- Flight CRUD operations (create, read, update, cancel)
- Flight search (database and OpenSearch)
- Flight availability checking
- Provider-specific flight listing
- Passenger list generation
- OpenSearch indexing

**Key Concepts:**
- Flight entity with source, destination, times, seats, price
- Flight status (ACTIVE, CANCELLED)
- Real-time seat availability tracking
- OpenSearch integration for fast, fuzzy search
- Provider ownership enforcement

### Booking Management Domain (Bookings Module)

**Purpose**: Handles seat booking operations and booking lifecycle.

**Responsibilities:**
- Booking creation with seat reservation
- Booking cancellation with seat restoration
- User booking history
- Booking status management (CONFIRMED, CANCELLED)

**Key Concepts:**
- Booking entity linking User to Flight
- Seat count and total price calculation
- Transaction safety (prevents overbooking)
- Redis locks for concurrency control
- Atomic database operations

### Search Domain (OpenSearch Integration)

**Purpose**: Provides fast, intelligent flight search.

**Responsibilities:**
- Indexing flights in OpenSearch
- Fuzzy search for cities (handles typos)
- Multi-criteria search (source, destination, date, provider)
- Pagination support
- Fallback to database search if OpenSearch fails

**Key Concepts:**
- Real-time indexing when flights are created/updated
- Fuzzy matching for city names
- Search result ranking
- Hybrid approach (OpenSearch primary, database fallback)

### Dashboard Domain (Dashboard Module)

**Purpose**: Provides aggregated views for users and providers.

**Responsibilities:**
- User dashboard (upcoming/past flights, booking summary)
- Provider dashboard (flight statistics, seat occupancy, revenue)

**Key Concepts:**
- Aggregated data presentation
- Role-specific dashboards
- Real-time statistics calculation

### Common/Shared Domain

**Purpose**: Reusable components across all modules.

**Components:**
- Guards (JWT authentication, role-based authorization)
- Decorators (for extracting current user, setting roles)
- Enums (user roles, booking status, flight status)
- DTOs (data transfer objects for validation)

**Key Concepts:**
- DRY principle (Don't Repeat Yourself)
- Centralized security logic
- Shared type definitions

## System Architecture Principles

### 1. Modular Design
Each domain is a separate NestJS module with its own controller, service, and entities. This allows independent development and testing.

### 2. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Entities**: Represent data models
- **Guards**: Handle security and authorization
- **DTOs**: Validate and transform data

### 3. Security by Default
- All protected routes require JWT authentication
- Role-based access control enforced at guard level
- Ownership checks prevent unauthorized access

### 4. Data Consistency
- Database transactions for atomic operations
- Redis distributed locks for concurrency control
- Foreign key constraints for referential integrity

### 5. Scalability Considerations
- Stateless JWT authentication (works across instances)
- Redis for distributed coordination
- OpenSearch for scalable search
- Database connection pooling

This architecture supports a multi-tenant system where multiple airlines (AIRWAY_PROVIDER users) can manage their flights independently, while regular users (USER role) can search and book flights across all providers.

## 4. User Roles and Responsibilities

The Airway Management System implements a two-role model that separates airline operators from passengers. This role-based separation is fundamental to the system's security, data integrity, and business logic.

### Role Overview

The system defines two distinct roles:
- **AIRWAY_PROVIDER**: Represents airlines/airway companies (e.g., Indigo, Air India, Emirates)
- **USER**: Represents passengers who search and book flights

Each role has specific permissions and restrictions that align with real-world airline operations and security requirements.

---

## 4.1 AIRWAY_PROVIDER Role

### Purpose in the System

The AIRWAY_PROVIDER role represents airline companies in the system. Each provider user account IS the airline itself - there is no separate airline entity. This design simplifies the data model while maintaining clear ownership boundaries.

**Real-World Mapping**: An AIRWAY_PROVIDER user represents an airline company like "Indigo Airlines" or "Air India". The user's name and email identify the airline, and all flights created by this user belong to that airline.

### Allowed Actions

#### Flight Management
- **Create Flights**: Add new flight schedules with source, destination, departure/arrival times, seat capacity, and pricing
- **View Own Flights**: Access a complete list of all flights they have created (both active and cancelled)
- **Update Flights**: Modify flight details such as times, prices, or seat capacity (only for their own flights)
- **Cancel Flights**: Mark flights as cancelled, which prevents new bookings (only their own flights)

#### Booking and Passenger Management
- **View Flight Bookings**: See all bookings made for any of their flights, including customer information
- **View Passenger Lists**: Access aggregated passenger information for their flights, including:
  - Total passengers per flight
  - Total seats booked
  - Total revenue generated
  - Individual passenger details (name, email, seats booked, booking status)

#### Analytics and Reporting
- **Provider Dashboard**: Access business intelligence including:
  - Total number of flights
  - Total seat capacity across all flights
  - Total seats booked
  - Per-flight boarding information

#### Public Operations
- **Search Flights**: Can search flights like any user (public endpoint)
- **View Flight Details**: Can view any flight's public information
- **View Profile**: Access their own user profile information

### Restricted Actions

#### Cannot Create Bookings
- **Why**: Providers are airlines, not passengers. They don't book seats on their own or other airlines' flights through the booking system. This maintains clear separation between operators and customers.

#### Cannot Access Other Providers' Private Data
- **Cannot view other providers' flights** through private endpoints (only their own via `/flights/my`)
- **Cannot view bookings for other providers' flights** (ownership is strictly enforced)
- **Cannot view passenger lists for other providers' flights**
- **Why**: Each airline operates independently. Cross-provider data access would violate data privacy, create security risks, and enable competitive intelligence gathering.

#### Cannot Access User-Specific Features
- **Cannot access user dashboard** (designed for passengers)
- **Cannot view other users' booking history** (privacy protection)
- **Why**: Providers manage flights, not personal travel itineraries. User dashboards are passenger-specific.

#### Cannot Modify Other Providers' Flights
- **Cannot update flights** belonging to other providers
- **Cannot cancel flights** belonging to other providers
- **Why**: Strict ownership enforcement prevents unauthorized modifications, data corruption, and malicious actions.

### Security and Business Rationale

1. **Data Isolation**: Each airline's data is isolated, preventing accidental or malicious access to competitor information
2. **Ownership Enforcement**: All flight operations require ownership verification, preventing cross-provider interference
3. **Business Logic Separation**: Providers manage inventory (flights), not consumption (bookings)
4. **Multi-Tenancy**: The system supports multiple airlines operating independently on the same platform

---

## 4.2 USER Role

### Purpose in the System

The USER role represents passengers who search for and book flights. These are end customers who use the system to find available flights and make reservations.

**Real-World Mapping**: A USER represents a passenger like "John Doe" who wants to book a flight from New York to Los Angeles. They can search across all airlines and book seats on any available flight.

### Allowed Actions

#### Flight Discovery
- **Search Flights**: Use advanced search with filters for:
  - Source city (with fuzzy matching for typos)
  - Destination city
  - Departure date
  - Provider/airline name
  - Flight number
- **View Flight Details**: Access complete flight information including:
  - Route details (source, destination)
  - Schedule (departure/arrival times)
  - Seat availability
  - Pricing
  - Provider information
- **Check Seat Availability**: View real-time seat availability for any flight

#### Booking Management
- **Create Bookings**: Reserve seats on any available flight by specifying:
  - Flight ID
  - Number of seats to book
  - System automatically calculates total price
- **View Own Bookings**: Access complete booking history including:
  - All bookings (confirmed and cancelled)
  - Flight details for each booking
  - Booking status and timestamps
  - Total prices paid
- **View Booking Details**: Get detailed information about a specific booking
- **Cancel Bookings**: Cancel their own bookings, which:
  - Changes booking status to CANCELLED
  - Automatically restores seats to the flight
  - Maintains booking record for history

#### Personal Dashboard
- **User Dashboard**: Access personalized travel information:
  - Total bookings count
  - Upcoming flights (sorted by departure time)
  - Past flights (completed travel history)
  - Booking status for each flight

#### Profile Management
- **View Profile**: Access their own user profile information

### Restricted Actions

#### Cannot Manage Flights
- **Cannot create flights**: Users are passengers, not airline operators
- **Cannot update flights**: Cannot modify flight schedules, prices, or capacity
- **Cannot cancel flights**: Cannot cancel entire flights (only their own bookings)
- **Why**: Flight management is exclusively for airlines. Users consume flight inventory, they don't create it.

#### Cannot Access Provider Features
- **Cannot access provider dashboard**: This is for airline business intelligence
- **Cannot view bookings for flights**: Cannot see who else booked the same flight
- **Cannot view passenger lists**: Cannot see other passengers on flights
- **Why**: Privacy protection and role separation. Users manage their own travel, not flight operations.

#### Cannot Access Other Users' Data
- **Cannot view other users' bookings**: Each user only sees their own booking history
- **Cannot view other users' profiles**: Privacy protection
- **Why**: Strict data privacy ensures users can only access their own personal information.

#### Cannot View Provider-Specific Flight Lists
- **Cannot access private provider endpoints**: Cannot use `/flights/my` (provider-only)
- **Why**: This endpoint is for providers to manage their own flights, not for users to browse.

### Security and Business Rationale

1. **Privacy Protection**: Users can only access their own booking data, preventing unauthorized access to other passengers' information
2. **Role Clarity**: Clear separation between consumers (users) and providers (airlines)
3. **Data Minimization**: Users only see information necessary for booking and managing their own travel
4. **Business Logic**: Users consume flight inventory (book seats), they don't manage it (create flights)

---

## 4.3 Why Role Separation is Critical

### Security Reasons

1. **Principle of Least Privilege**: Each role has only the minimum permissions needed for their function
   - Providers don't need booking capabilities
   - Users don't need flight management capabilities
   - This reduces attack surface and potential for misuse

2. **Data Protection**: Strict role boundaries prevent:
   - Unauthorized access to competitor data (providers)
   - Unauthorized access to passenger data (users)
   - Cross-role privilege escalation

3. **Audit Trail**: Role-based access makes it clear who performed what action, enabling better security auditing

### Business Reasons

1. **Real-World Alignment**: Roles mirror actual airline industry structure:
   - Airlines manage flights and inventory
   - Passengers book and travel
   - These are fundamentally different business functions

2. **Multi-Tenancy Support**: Multiple airlines can operate independently:
   - Each provider only sees their own data
   - No risk of cross-contamination
   - Enables competitive marketplace

3. **Scalability**: Clear role separation allows:
   - Independent scaling of user-facing vs provider-facing features
   - Different security policies per role
   - Easier feature development (know which role needs what)

4. **Compliance**: Role separation helps meet data protection regulations:
   - Passenger data privacy (users can't see other users)
   - Business data confidentiality (providers can't see competitors)

### Operational Reasons

1. **Error Prevention**: Prevents accidental actions:
   - Providers can't accidentally book seats
   - Users can't accidentally modify flight schedules

2. **Workflow Clarity**: Clear boundaries make the system intuitive:
   - Providers know they manage flights
   - Users know they book flights
   - No confusion about who does what

3. **Support Efficiency**: Role-based restrictions reduce support burden:
   - Fewer accidental misuse cases
   - Clearer error messages (role-specific)
   - Easier troubleshooting (know which role is involved)

---

## 4.4 How Roles Map to Real-World Airline Operations

### AIRWAY_PROVIDER = Airline Operations Team

In real airlines, flight management is handled by:
- **Operations teams** who create flight schedules
- **Revenue management** who set prices
- **Customer service** who view bookings and passenger lists
- **Analytics teams** who review business metrics

The AIRWAY_PROVIDER role combines these functions into a single account, allowing airline staff to:
- Manage their flight inventory (create, update, cancel)
- Monitor bookings and revenue
- View passenger information for operational needs
- Access business intelligence dashboards

### USER = Passenger/Customer

In real airlines, passengers:
- **Search** for flights through booking platforms
- **Book** seats on available flights
- **Manage** their own reservations (view, cancel)
- **Track** their travel history

The USER role enables passengers to:
- Discover flights across all airlines
- Make reservations
- Manage their own bookings
- View their travel history

### System as Marketplace

The system functions as a **multi-tenant marketplace**:
- **Multiple airlines** (AIRWAY_PROVIDER users) list their flights
- **Many passengers** (USER role) search and book across all airlines
- Each airline operates independently
- Passengers can compare and choose from all available options

This mirrors real-world platforms like:
- **Booking.com**: Multiple hotels, many customers
- **Uber**: Multiple drivers, many riders
- **Airbnb**: Multiple hosts, many guests

The role separation ensures:
- Airlines maintain control over their inventory
- Passengers have equal access to all airlines
- No single airline can interfere with others
- Privacy is maintained for all parties

---

## Summary: Role Permissions Matrix

| Action | USER | AIRWAY_PROVIDER |
|--------|------|-----------------|
| Search flights | ✅ | ✅ |
| View flight details | ✅ | ✅ |
| Create flights | ❌ | ✅ (own only) |
| Update flights | ❌ | ✅ (own only) |
| Cancel flights | ❌ | ✅ (own only) |
| View own flights | ❌ | ✅ |
| Create bookings | ✅ | ❌ |
| View own bookings | ✅ | ❌ |
| Cancel own bookings | ✅ | ❌ |
| View flight bookings | ❌ | ✅ (own flights only) |
| View passenger lists | ❌ | ✅ (own flights only) |
| User dashboard | ✅ | ❌ |
| Provider dashboard | ❌ | ✅ |
| View profile | ✅ | ✅ |

This role-based architecture ensures security, privacy, and operational clarity while supporting a scalable multi-tenant airline marketplace.

## 5. JWT Authentication Flow

The Airway Management System uses JSON Web Tokens (JWT) for stateless authentication. This section explains the complete authentication flow from login to request validation.

---

## 5.1 Login Process - Step-by-Step

### Step 1: Client Initiates Login

The client sends a POST request to `/auth/login` with credentials:
- **Email**: User's email address
- **Password**: User's plain text password

**Important**: The password is sent over HTTPS (encrypted in transit) but arrives at the server as plain text for validation.

### Step 2: Server Receives Login Request

The NestJS controller (`AuthController`) receives the login request and forwards it to `AuthService.login()`.

### Step 3: User Lookup

The service queries the database to find a user with the provided email address:
- If no user exists with that email → **401 Unauthorized** ("Invalid credentials")
- If user exists → Proceed to password validation

**Security Note**: The error message is generic ("Invalid credentials") whether the email doesn't exist or the password is wrong. This prevents email enumeration attacks where attackers could discover which emails are registered.

### Step 4: Password Validation

The service retrieves the stored password hash from the database and compares it with the provided password using bcrypt:
- **bcrypt.compare()** hashes the provided password and compares it with the stored hash
- If passwords don't match → **401 Unauthorized** ("Invalid credentials")
- If passwords match → Proceed to token generation

**Security Note**: Passwords are never stored in plain text. They are hashed using bcrypt with a salt factor of 10, making them computationally expensive to crack even if the database is compromised.

### Step 5: JWT Token Generation

Once credentials are validated, the service creates a JWT payload containing:
- **sub** (subject): User's unique ID
- **email**: User's email address
- **role**: User's role (USER or AIRWAY_PROVIDER)

The JWT service signs this payload using the `JWT_SECRET` from environment variables, creating a cryptographically signed token.

### Step 6: Response to Client

The server returns a JSON response containing:
- **access_token**: The JWT token string
- **expiresIn**: Token expiration timestamp (ISO format)
- **User information**: ID, email, name, role (password excluded)

The client stores this token (typically in localStorage, sessionStorage, or memory) for use in subsequent requests.

---

## 5.2 JWT Token Structure

### What is a JWT?

A JWT is a compact, URL-safe token consisting of three parts separated by dots (`.`):

```
header.payload.signature
```

**Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`

### JWT Components

#### 1. Header
Contains metadata about the token:
- **Algorithm**: How the token is signed (e.g., HS256 - HMAC with SHA-256)
- **Type**: Always "JWT"

#### 2. Payload (Claims)
Contains the actual data. In this system, the payload includes:

- **sub** (Subject): User's unique ID (UUID)
  - **Why**: Identifies which user the token belongs to
  - **Used for**: Database lookups to fetch user details

- **email**: User's email address
  - **Why**: Provides user identification without database lookup
  - **Used for**: Logging, debugging, and user identification

- **role**: User's role (USER or AIRWAY_PROVIDER)
  - **Why**: Enables role-based authorization without database query
  - **Used for**: Guard-based access control decisions

- **iat** (Issued At): Timestamp when token was created
  - **Why**: Token age tracking
  - **Used for**: Security auditing

- **exp** (Expiration): Timestamp when token expires
  - **Why**: Limits token lifetime for security
  - **Used for**: Automatic token expiration

**Important**: The payload is Base64-encoded, NOT encrypted. Anyone can decode it, but they cannot modify it without invalidating the signature.

#### 3. Signature
Cryptographically signs the header and payload using the `JWT_SECRET`:
- **Purpose**: Ensures token hasn't been tampered with
- **Validation**: Server verifies signature on every request
- **Security**: Without the secret, tokens cannot be forged

### Why This Payload Structure?

The payload is designed to be **self-contained** and **minimal**:
- **Self-contained**: Contains enough information to identify and authorize the user
- **Minimal**: Only includes essential data to keep token size small
- **Stateless**: No need to query database for basic user info on every request

---

## 5.3 How Client Sends JWT with Requests

### Authorization Header

The client includes the JWT token in the HTTP request header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Format**: `Bearer <token>`
- **Bearer**: Indicates this is a bearer token (possession-based authentication)
- **Token**: The actual JWT string

### Where Clients Store Tokens

Common storage locations:
- **localStorage**: Persists across browser sessions (survives page refresh)
- **sessionStorage**: Persists only for current tab/window
- **Memory**: Most secure but lost on page refresh
- **HttpOnly Cookie**: Most secure for web apps (not accessible to JavaScript)

### Client Request Example

```
GET /flights/my HTTP/1.1
Host: api.airway.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 5.4 How NestJS Validates JWT on Incoming Requests

### Request Flow Through Authentication

#### Step 1: Request Arrives at Controller

When a protected endpoint receives a request, NestJS intercepts it before the controller method executes.

#### Step 2: JWT Auth Guard Activates

The `@UseGuards(JwtAuthGuard)` decorator activates the JWT authentication guard. This guard:
- Extracts the token from the `Authorization` header
- Looks for the pattern: `Bearer <token>`
- If no token found → **401 Unauthorized**

#### Step 3: Token Extraction

The JWT Strategy (`JwtStrategy`) uses `ExtractJwt.fromAuthHeaderAsBearerToken()` to:
- Read the `Authorization` header
- Remove the "Bearer " prefix
- Extract the token string

#### Step 4: Token Verification

The JWT Strategy verifies the token using:
- **Secret Key**: `JWT_SECRET` from environment variables
- **Algorithm**: Matches the algorithm used during signing (HS256)
- **Expiration Check**: Verifies the token hasn't expired (`ignoreExpiration: false`)

**Verification Process**:
1. Decode the token (header, payload, signature)
2. Recalculate the signature using the secret key
3. Compare calculated signature with token signature
4. If signatures don't match → Token is invalid or tampered with
5. Check expiration timestamp (`exp`)
6. If expired → Token is no longer valid

#### Step 5: Payload Extraction

If verification succeeds, the guard extracts the payload containing:
- `sub` (user ID)
- `email`
- `role`
- `iat`, `exp` (timestamps)

#### Step 6: User Lookup and Validation

The JWT Strategy's `validate()` method receives the payload and:
- Uses `payload.sub` (user ID) to query the database
- Fetches the complete user record from the database
- If user doesn't exist → **401 Unauthorized** (user may have been deleted)
- If user exists → Returns the full user object

**Why Database Lookup?**
Even though the token contains user info, the system:
- Verifies the user still exists (may have been deleted)
- Fetches the latest user data (role may have changed)
- Ensures token validity matches current system state

#### Step 7: Attaching User to Request

The validated user object is attached to the request as `request.user`. This makes the user available throughout the request lifecycle:
- In controller methods via `@CurrentUser()` decorator
- In service methods if passed as parameter
- In other guards for authorization checks

---

## 5.5 How request.user is Populated

### The CurrentUser Decorator

Controllers use the `@CurrentUser()` decorator to access the authenticated user:

```typescript
getMyFlights(@CurrentUser() user: User) {
  // user is automatically populated from request.user
  return this.flightsService.findByProvider(user.id);
}
```

### How It Works

1. **JWT Guard** validates token and fetches user from database
2. **JWT Strategy** returns user object from `validate()` method
3. **Passport** (underlying library) attaches user to `request.user`
4. **CurrentUser Decorator** extracts `request.user` and injects it as parameter

### Request Object Structure

After authentication, the request object contains:
```
request.user = {
  id: "uuid",
  email: "user@example.com",
  name: "John Doe",
  role: "USER",
  createdAt: Date,
  updatedAt: Date
}
```

**Note**: Password is never included in `request.user` for security.

---

## 5.6 Error Scenarios and Responses

### Scenario 1: Token is Missing

**When it happens**: Client sends request without `Authorization` header or with invalid format.

**What happens**:
1. JWT Guard tries to extract token from header
2. No token found or invalid format
3. Guard throws `UnauthorizedException`

**Response**: 
- **Status Code**: `401 Unauthorized`
- **Message**: "Unauthorized" or similar

**Client Action**: Redirect to login page or prompt user to authenticate.

### Scenario 2: Token is Invalid

**When it happens**: 
- Token signature doesn't match (tampered with)
- Token was signed with different secret key
- Token format is malformed

**What happens**:
1. JWT Guard extracts token
2. JWT Strategy attempts to verify signature
3. Signature verification fails
4. Guard throws `UnauthorizedException`

**Response**:
- **Status Code**: `401 Unauthorized`
- **Message**: "Unauthorized" or "Invalid token"

**Client Action**: Clear stored token, redirect to login.

### Scenario 3: Token is Expired

**When it happens**: Token's `exp` (expiration) timestamp is in the past.

**What happens**:
1. JWT Guard extracts and verifies token signature
2. JWT Strategy checks expiration timestamp
3. Current time > expiration time
4. Guard throws `UnauthorizedException`

**Response**:
- **Status Code**: `401 Unauthorized`
- **Message**: "Token expired" or "Unauthorized"

**Client Action**: 
- Implement token refresh mechanism (if available)
- Or clear token and redirect to login
- Client should handle this gracefully with automatic re-authentication

### Scenario 4: User No Longer Exists

**When it happens**: Token is valid, but user was deleted from database after token was issued.

**What happens**:
1. Token passes signature and expiration checks
2. JWT Strategy's `validate()` method queries database for user
3. User not found
4. Strategy throws `UnauthorizedException`

**Response**:
- **Status Code**: `401 Unauthorized`
- **Message**: "Unauthorized"

**Why this check exists**: Prevents access with tokens for deleted users, ensuring security even if tokens haven't expired.

---

## 5.7 Why JWT is Stateless

### Stateless vs Stateful Authentication

**Stateful Authentication** (Session-based):
- Server stores session data in memory or database
- Each request requires session lookup
- Server must maintain session state
- Scaling requires session sharing (Redis, database)

**Stateless Authentication** (JWT):
- Server doesn't store any session data
- Token contains all necessary information
- Each request is independent
- No server-side storage needed

### How JWT Achieves Statelessness

1. **Self-Contained Token**: All user information needed for authentication is in the token itself
2. **Cryptographic Signature**: Token can be verified without database lookup (except for user existence check)
3. **No Session Storage**: Server doesn't need to store or track tokens
4. **Independent Validation**: Each request can be validated independently

### Benefits of Stateless Authentication

1. **Scalability**: 
   - Multiple server instances can validate tokens independently
   - No need for shared session storage
   - Horizontal scaling is easier

2. **Performance**:
   - No database lookup for session validation (only for user existence)
   - Faster request processing
   - Reduced database load

3. **Simplicity**:
   - No session management code
   - No session cleanup jobs
   - Simpler architecture

4. **Mobile-Friendly**:
   - Works well with mobile apps
   - No cookie management needed
   - Token can be stored securely on device

---

## 5.8 Why JWT is Suitable for This System

### System Requirements Alignment

#### 1. Multi-Instance Deployment
The system may run on multiple server instances (load balancing, horizontal scaling). JWT's stateless nature means:
- Any instance can validate any token
- No shared session storage required
- Easy to scale horizontally

#### 2. Role-Based Authorization
JWT payload includes the user's role, enabling:
- Fast authorization decisions without database queries
- Role information available immediately after token validation
- Efficient guard-based access control

#### 3. API-First Architecture
The system is backend-only (REST API), making JWT ideal because:
- Works with any client (web, mobile, third-party)
- Standard HTTP header-based authentication
- No cookie dependencies

#### 4. Security Requirements
JWT provides:
- **Tamper-proof**: Cryptographic signature prevents modification
- **Time-limited**: Expiration prevents indefinite access
- **Revocable**: User deletion invalidates tokens (via database check)
- **Secure**: HTTPS ensures token transmission security

#### 5. Performance Requirements
JWT enables:
- **Fast validation**: Signature verification is computationally cheap
- **Reduced database load**: Only one user lookup per request (for existence check)
- **Caching-friendly**: Token validation doesn't require cache invalidation

### Trade-offs and Considerations

#### Advantages
- ✅ Stateless and scalable
- ✅ Works across multiple servers
- ✅ Fast validation
- ✅ Self-contained user information
- ✅ Industry standard

#### Limitations
- ⚠️ Token size: Larger than session IDs (but still small)
- ⚠️ Cannot revoke tokens immediately (until expiration)
- ⚠️ Payload is readable (but not modifiable)
- ⚠️ Requires database lookup for user existence (acceptable trade-off)

#### Why These Trade-offs are Acceptable

1. **Token Size**: JWT tokens are typically 200-500 bytes, negligible for HTTP requests
2. **Revocation**: User deletion check provides revocation. For immediate revocation, implement a token blacklist (Redis)
3. **Readable Payload**: Only contains non-sensitive data (ID, email, role). Sensitive data should never be in tokens
4. **Database Lookup**: Single query per request is acceptable for security and data freshness

---

## Summary: Complete Authentication Flow

```
1. Client Login Request
   ↓
2. Server Validates Credentials (email + password)
   ↓
3. Server Generates JWT Token (with user ID, email, role)
   ↓
4. Server Returns Token to Client
   ↓
5. Client Stores Token
   ↓
6. Client Sends Request with Token (Authorization: Bearer <token>)
   ↓
7. JWT Guard Extracts Token from Header
   ↓
8. JWT Strategy Verifies Token (signature + expiration)
   ↓
9. JWT Strategy Validates User Exists in Database
   ↓
10. User Object Attached to request.user
    ↓
11. Controller Method Executes with Authenticated User
    ↓
12. Response Returned to Client
```

This authentication flow ensures secure, scalable, and efficient user authentication across the entire Airway Management System.

