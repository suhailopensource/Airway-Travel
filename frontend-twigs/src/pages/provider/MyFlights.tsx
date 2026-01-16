import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Flex, Chip } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatCurrency, canUpdateFlight } from '../../utils/helpers';
import { Flight } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const MyFlights = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchFlights = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await flightsAPI.getMyFlights();
        setFlights(data);
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load flights');
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <div className="dashboard-header">
        <Flex justify="between" align="center">
          <div>
            <h1 className="dashboard-title">My Flights</h1>
            <p className="dashboard-subtitle">Manage all your flight schedules and bookings</p>
          </div>
          <Button
            as={Link}
            to="/flights/create"
            css={{
              background: 'var(--ss-success)',
              color: 'white',
              border: 'none',
              '&:hover': {
                background: '#059669',
                transform: 'scale(1.05)',
              },
            }}
            size="lg"
          >
            Create New Flight
          </Button>
        </Flex>
      </div>

      {flights.length > 0 ? (
        <div className="flight-list">
          {flights.map((flight) => {
            const canUpdate = canUpdateFlight(flight);
            
            return (
              <div key={flight.id} className="flight-item-card">
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">{flight.flightNumber}</div>
                    <div className="flight-item-route">{flight.source} → {flight.destination}</div>
                  </div>
                  <Chip
                    variant={flight.status === 'SCHEDULED' ? 'success' : 'error'}
                    css={{ fontSize: '0.75rem' }}
                  >
                    {flight.status}
                  </Chip>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Departure: {formatDate(flight.departureTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>🛬</span>
                    <span>Arrival: {formatDate(flight.arrivalTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{flight.availableSeats} / {flight.totalSeats} available</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💰</span>
                    <span>{formatCurrency(flight.price)} per seat</span>
                  </div>
                </div>
                <div className="flight-actions" style={{ marginTop: '1rem' }}>
                  <Button
                    as={Link}
                    to={`/flights/${flight.id}/bookings`}
                    className="btn-primary"
                  >
                    View Bookings
                  </Button>
                  <Button
                    as={Link}
                    to={`/flights/${flight.id}/passengers`}
                    className="btn-success"
                  >
                    View Passengers
                  </Button>
                  {canUpdate && (
                    <Button
                      as={Link}
                      to={`/flights/${flight.id}/edit`}
                      className="btn-warning"
                    >
                      Edit Flight
                    </Button>
                  )}
                  {!canUpdate && (
                    <Chip variant="error" css={{ fontSize: '0.875rem' }}>
                      Cannot edit {flight.status} flight
                    </Chip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">✈️</div>
          <div className="empty-state-title">No flights yet</div>
          <div className="empty-state-text">Create your first flight to start managing your airline operations</div>
          <Button
            as={Link}
            to="/flights/create"
            css={{
              background: 'var(--ss-success)',
              color: 'white',
              marginTop: '1rem',
              '&:hover': {
                background: '#059669',
              },
            }}
            size="lg"
          >
            Create Your First Flight
          </Button>
        </div>
      )}
    </Box>
  );
};

