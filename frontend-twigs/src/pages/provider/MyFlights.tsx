import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Flex, Chip, AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogActions, AlertDialogAction, AlertDialogCancel } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { formatDate, formatCurrency, canUpdateFlight, canCancelFlight } from '../../utils/helpers';
import { Flight } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const MyFlights = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

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


  const handleCancelFlight = async (flightId: string): Promise<void> => {
    setCancellingId(flightId);
    setError('');
    setSuccess('');

    try {
      await flightsAPI.cancel(flightId);
      setSuccess('Flight cancelled successfully. All bookings for this flight have been cancelled.');
      setCancelDialogOpen(false);
      setSelectedFlightId(null);
      
      // Refresh flights list
      const data = await flightsAPI.getMyFlights();
      setFlights(data);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to cancel flight');
    } finally {
      setCancellingId(null);
    }
  };

  const openCancelDialog = (flightId: string): void => {
    setSelectedFlightId(flightId);
    setCancelDialogOpen(true);
  };

  if (loading) return <Loading />;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

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
            const canCancel = canCancelFlight(flight);
            
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
                  {canCancel && (
                    <AlertDialog open={cancelDialogOpen && selectedFlightId === flight.id} onOpenChange={(open) => {
                      setCancelDialogOpen(open);
                      if (!open) setSelectedFlightId(null);
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="btn-error"
                          onClick={() => openCancelDialog(flight.id)}
                        >
                          Cancel Flight
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Cancel Flight</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel flight <strong>{flight.flightNumber}</strong>? 
                          <br /><br />
                          This action will:
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            <li>Mark the flight as CANCELLED</li>
                            <li>Cancel all confirmed bookings for this flight</li>
                            <li>Restore all seats to available</li>
                          </ul>
                          <br />
                          This action cannot be undone.
                        </AlertDialogDescription>
                        <AlertDialogActions>
                          <AlertDialogCancel asChild>
                            <Button className="btn-outline">
                              Keep Flight
                            </Button>
                          </AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button
                              onClick={() => handleCancelFlight(flight.id)}
                              disabled={cancellingId === flight.id}
                              className="btn-error"
                            >
                              {cancellingId === flight.id ? 'Cancelling...' : 'Yes, Cancel Flight'}
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogActions>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {!canCancel && flight.status !== 'CANCELLED' && (
                    <Chip variant="warning" css={{ fontSize: '0.875rem' }}>
                      Cannot cancel {flight.status} flight
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

