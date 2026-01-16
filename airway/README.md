# Airway Management System

A comprehensive backend system for managing flights, bookings, and users with role-based access control.

## Architecture

- **Each AIRWAY_PROVIDER user IS the airline** - No separate airway entity
- **Direct relationship**: User (AIRWAY_PROVIDER) → Flights
- **Simple model**: Users, Flights, Bookings

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh

# Start the application
npm run start:dev
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with database credentials

# 3. Start Docker containers
docker-compose up -d

# 4. Wait 30-60 seconds for services to be healthy

# 5. Start the application
npm run start:dev
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api

## Roles

### USER
- Search and view flights
- Book seats
- View and cancel own bookings

### AIRWAY_PROVIDER
- Create and manage flights
- View bookings for their flights
- View dashboard with flight statistics

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Flights (Public)
- `GET /flights/search` - Search flights
- `GET /flights/:id` - Get flight details

### Flights (AIRWAY_PROVIDER)
- `POST /flights` - Create flight
- `GET /flights/my` - Get provider's flights
- `GET /flights/:id/bookings` - View bookings for a flight
- `PATCH /flights/:id` - Update flight
- `DELETE /flights/:id` - Cancel flight

### Bookings (USER)
- `POST /bookings` - Create booking
- `GET /bookings/my` - Get user's bookings
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/cancel` - Cancel booking

### Dashboard
- `GET /dashboard/user` - User dashboard (USER role)
- `GET /dashboard/provider` - Provider dashboard (AIRWAY_PROVIDER role)

## Database

### View Database
```bash
node view-database.js
```

### Reset Database
The database is already set up with the correct schema. All tables are clean and ready to use.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Cache**: Redis
- **Search**: OpenSearch
- **Authentication**: JWT
- **Documentation**: Swagger

## Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── flights/        # Flight management
├── bookings/       # Booking management
├── dashboard/      # Dashboard APIs
├── common/         # Shared utilities, guards, decorators
├── database/       # Database configuration
├── redis/          # Redis service
└── opensearch/     # OpenSearch service
```

## Environment Variables

Create a `.env` file with:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=airway_user
DB_PASSWORD=airway_password
DB_DATABASE=airway_db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenSearch
OPENSEARCH_NODE=http://localhost:9200
```

## Development

```bash
# Start in development mode
npm run start:dev

# Build
npm run build

# Start production
npm run start:prod
```

## License

MIT
