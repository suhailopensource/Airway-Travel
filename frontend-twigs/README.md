# Airway Management System - Frontend (Twigs UI)

Complete React frontend for the Airway Management System, built with Vite and **Twigs UI component library** (v0.37.2).

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **User Role (Passenger)**:
  - Search and view flights
  - Create bookings
  - View own bookings and dashboard
  - Cancel own bookings
  
- **Airway Provider Role (Airline Admin)**:
  - Create and manage flights
  - View flight bookings
  - View passenger lists
  - Provider dashboard with statistics

## Tech Stack

- React 19
- Vite
- React Router DOM
- Axios
- **Twigs UI** (@sparrowengg/twigs-react v0.37.2) - Component library
- Context API for state management

## Project Structure

```
src/
  api/              # API layer (axios instance and endpoints)
  auth/             # Authentication context and guards
  components/       # Reusable UI components (using Twigs)
  pages/
    auth/           # Login, Register
    public/         # Flight Search, Flight Details
    user/           # User dashboard, bookings
    provider/       # Provider dashboard, flights management
  utils/            # Helper functions and constants
  App.jsx           # Main app component with routing and ThemeProvider
  main.jsx          # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:3000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will run on http://localhost:5173 (or the next available port).

## Twigs UI Components Used

This frontend uses [Twigs UI](https://twigs.surveysparrow.com/) component library:

- **Layout**: `Box`, `Flex`, `Grid`
- **Forms**: `Input`, `Select`, `Button`
- **Display**: `Text`, `Card`, `Badge`
- **Feedback**: Custom `ErrorMessage`, `SuccessMessage`, `Loading` components
- **Theme**: `ThemeProvider` wraps the entire application

## API Configuration

The frontend is configured to connect to the backend API at `http://localhost:3000`. 

To change the API base URL, update `src/api/axios.js`:

```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000', // Change this
  // ...
});
```

## Authentication

- JWT tokens are stored in `localStorage` as `access_token`
- User data is stored in `localStorage` as `user`
- Tokens are automatically attached to API requests via axios interceptor
- On 401 errors, users are automatically logged out and redirected to login

## Role-Based Access

The application enforces role-based access control:

- **USER**: Can access user dashboard, bookings, and booking creation
- **AIRWAY_PROVIDER**: Can access provider dashboard, flight management, bookings, and passenger lists

Routes are protected using `RoleProtectedRoute` component which checks user roles.

## Key Features

### Flight Booking Validation

- Prevents booking if flight is cancelled
- Prevents booking if departure time has passed
- Prevents booking if no seats available
- Client-side validation before API calls

### Flight Management Validation

- Prevents updating cancelled flights
- Validates departure/arrival times
- Ensures total seats > 0

## Differences from Standard Frontend

This frontend uses **Twigs UI components** instead of inline styles:

- All styling is done through Twigs component props and CSS-in-JS
- Consistent design system with Twigs theme
- Accessible components out of the box
- Responsive layouts using Twigs Grid and Flex components

## Development Notes

- All API endpoints are derived from the backend codebase
- Error messages from backend are displayed verbatim to users
- Loading states are shown during API calls
- Success/error messages are displayed using custom components built with Twigs

## Backend Alignment

This frontend strictly follows the backend API structure:

- Endpoints match backend routes exactly
- Request/response payloads match backend DTOs
- Role-based access matches backend guards
- Validation rules match backend validation

## License

See main project README for license information.
