import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Text, Flex, Chip } from '@sparrowengg/twigs-react';
import { dashboardAPI } from '../../api/dashboard';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { UserDashboard as UserDashboardType } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

interface DashboardFlight {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  numberOfSeats: number;
  totalPrice: string;
  bookingStatus: string;
  provider?: {
    name?: string;
    email?: string;
  };
}

export const UserDashboard = () => {
  const [dashboard, setDashboard] = useState<UserDashboardType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchDashboard = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await dashboardAPI.getUserDashboard();
        setDashboard(data);
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!dashboard) return <Text>No data available</Text>;

  const upcomingFlights = dashboard.upcomingFlights as DashboardFlight[] | undefined;
  const pastFlights = dashboard.pastFlights as DashboardFlight[] | undefined;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <h1 className="dashboard-title">My Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back! Here's an overview of your bookings</p>
      </div>
      
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card primary">
          <div className="stat-label">Active Bookings</div>
          <div className="stat-value">{dashboard.totalBookings}</div>
        </div>
        {upcomingFlights && upcomingFlights.length > 0 && (
          <div className="stat-card success">
            <div className="stat-label">Upcoming Flights</div>
            <div className="stat-value">{upcomingFlights.length}</div>
          </div>
        )}
        {pastFlights && pastFlights.length > 0 && (
          <div className="stat-card info">
            <div className="stat-label">Past Flights</div>
            <div className="stat-value">{pastFlights.length}</div>
          </div>
        )}
      </div>

      {upcomingFlights && upcomingFlights.length > 0 && (
        <Box css={{ marginBottom: '3rem' }}>
          <h2 className="section-title">Upcoming Flights</h2>
          <div className="flight-list">
            {upcomingFlights.map((flight) => (
              <div key={flight.id} className="flight-item-card">
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">{flight.flightNumber}</div>
                    <div className="flight-item-route">{flight.origin} → {flight.destination}</div>
                  </div>
                  <Chip
                    variant={flight.bookingStatus === 'CONFIRMED' ? 'success' : 'warning'}
                    css={{ fontSize: '0.75rem' }}
                  >
                    {flight.bookingStatus}
                  </Chip>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Departure: {formatDate(flight.departureTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{flight.numberOfSeats} seats</span>
                  </div>
                  {flight.provider && (
                    <div className="flight-item-meta-item">
                      <span>✈️</span>
                      <span>Airline: {flight.provider.name || flight.provider.email || 'N/A'}</span>
                    </div>
                  )}
                </div>
                <div className="flight-item-price">
                  Total: {formatCurrency(parseFloat(flight.totalPrice))}
                </div>
                <div className="flight-actions">
                  <Button
                    as={Link}
                    to={`/flights/${flight.id}`}
                    className="btn-primary"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      {pastFlights && pastFlights.length > 0 && (
        <Box css={{ marginTop: '3rem' }}>
          <h2 className="section-title">Past Flights</h2>
          <div className="flight-list">
            {pastFlights.map((flight) => (
              <div key={flight.id} className="flight-item-card" style={{ opacity: 0.85 }}>
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">{flight.flightNumber}</div>
                    <div className="flight-item-route">{flight.origin} → {flight.destination}</div>
                  </div>
                  <Chip
                    variant={flight.bookingStatus === 'CONFIRMED' ? 'success' : 'warning'}
                    css={{ fontSize: '0.75rem' }}
                  >
                    {flight.bookingStatus}
                  </Chip>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Departure: {formatDate(flight.departureTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{flight.numberOfSeats} seats</span>
                  </div>
                  {flight.provider && (
                    <div className="flight-item-meta-item">
                      <span>✈️</span>
                      <span>Airline: {flight.provider.name || flight.provider.email || 'N/A'}</span>
                    </div>
                  )}
                </div>
                <div className="flight-item-price">
                  Total: {formatCurrency(parseFloat(flight.totalPrice))}
                </div>
                <div className="flight-actions">
                  <Button
                    as={Link}
                    to={`/flights/${flight.id}`}
                    className="btn-outline"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      {dashboard.totalBookings === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✈️</div>
          <div className="empty-state-title">No bookings yet</div>
          <div className="empty-state-text">Start exploring flights and book your first trip!</div>
          <Button
            as={Link}
            to="/flights/search"
            className="btn-primary"
            size="lg"
            css={{ marginTop: '1rem' }}
          >
            Search Flights
          </Button>
        </div>
      )}
    </Box>
  );
};

