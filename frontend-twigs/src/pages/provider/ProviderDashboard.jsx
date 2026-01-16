import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Text, Flex, Grid } from '@sparrowengg/twigs-react';
import { dashboardAPI } from '../../api/dashboard';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate } from '../../utils/helpers';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const ProviderDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await dashboardAPI.getProviderDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!dashboard) return <Text>No data available</Text>;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
      <Flex
  align="center"
  justify="space-between"
  css={{
    gap: '$lg',
    flexWrap: 'wrap',
  }}
>
  <div>
    <h1 className="dashboard-title">Provider Dashboard</h1>
    <p className="dashboard-subtitle">
      Manage your Active flights and track performance
    </p>
  </div>

  
</Flex>
<Button
    as={Link}
    to="/flights/create"
    className="btn-success"
    size="lg"
  >
    Create New Flight
  </Button>

      </div>

      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card primary">
          <div className="stat-label">Active Flights</div>
          <div className="stat-value">{dashboard.totalFlights}</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-label">Total Seats</div>
          <div className="stat-value">{dashboard.totalSeats}</div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-label">Booked Seats</div>
          <div className="stat-value">{dashboard.bookedSeats}</div>
        </div>
      </div>

      {dashboard.flights && dashboard.flights.length > 0 ? (
        <Box css={{ marginTop: '3rem' }}>
          <h2 className="section-title">Flight Overview</h2>
          <div className="flight-list">
            {dashboard.flights.map((flight) => (
              <div key={flight.flightId} className="flight-item-card">
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">{flight.flightNumber}</div>
                    <div className="flight-item-route">{flight.origin} → {flight.destination}</div>
                  </div>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Departure: {formatDate(flight.departureTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>
                      {flight.bookedSeats} / {flight.totalSeats} booked ({flight.availableSeats} available)
                    </span>
                  </div>
                </div>
                <div className="flight-actions">
                  <Button
                    as={Link}
                    to={`/flights/${flight.flightId}/bookings`}
                    className="btn-primary"
                  >
                    View Bookings
                  </Button>
                  <Button
                    as={Link}
                    to={`/flights/${flight.flightId}/passengers`}
                    className="btn-success"
                  >
                    View Passengers
                  </Button>
                  <Button
                    as={Link}
                    to={`/flights/${flight.flightId}/edit`}
                    className="btn-outline"
                  >
                    Edit Flight
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Box>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">✈️</div>
          <div className="empty-state-title">No flights yet</div>
          <div className="empty-state-text">Create your first flight to get started!</div>
          <Button
            as={Link}
            to="/flights/create"
            className="btn-success"
            size="lg"
            css={{ marginTop: '1rem' }}
          >
            Create Your First Flight
          </Button>
        </div>
      )}
    </Box>
  );
};

