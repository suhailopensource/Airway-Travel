import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@sparrowengg/twigs-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute, RoleProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { ROLES } from './utils/constants';

// Public Pages
import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { FlightSearch } from './pages/public/FlightSearch';
import { FlightDetails } from './pages/public/FlightDetails';

// User Pages
import { UserDashboard } from './pages/user/UserDashboard';
import { UserProfile } from './pages/user/UserProfile';
import { MyBookings } from './pages/user/MyBookings';
import { BookingDetails } from './pages/user/BookingDetails';
import { CreateBooking } from './pages/user/CreateBooking';

// Provider Pages
import { ProviderDashboard } from './pages/provider/ProviderDashboard';
import { ProviderProfile } from './pages/provider/ProviderProfile';
import { MyFlights } from './pages/provider/MyFlights';
import { CreateFlight } from './pages/provider/CreateFlight';
import { UpdateFlight } from './pages/provider/UpdateFlight';
import { FlightBookings } from './pages/provider/FlightBookings';
import { PassengerList } from './pages/provider/PassengerList';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/flights/search" element={<FlightSearch />} />
      <Route path="/flights/:id" element={<FlightDetails />} />

      {/* User Routes */}
      <Route
        path="/dashboard/user"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.USER]}>
            <UserDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/profile/user"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.USER]}>
            <UserProfile />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/bookings/my"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.USER]}>
            <MyBookings />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/bookings/:id"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.USER]}>
            <BookingDetails />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/:id/book"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.USER]}>
            <CreateBooking />
          </RoleProtectedRoute>
        }
      />

      {/* Provider Routes */}
      <Route
        path="/dashboard/provider"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <ProviderDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/profile/provider"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <ProviderProfile />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/my"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <MyFlights />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/create"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <CreateFlight />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/:id/edit"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <UpdateFlight />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/:id/bookings"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <FlightBookings />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/flights/:id/passengers"
        element={
          <RoleProtectedRoute allowedRoles={[ROLES.AIRWAY_PROVIDER]}>
            <PassengerList />
          </RoleProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <AppRoutes />
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

