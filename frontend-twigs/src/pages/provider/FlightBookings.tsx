import { useState, useEffect, MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Text, Flex, Chip } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { bookingsAPI } from '../../api/bookings';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { BackButton } from '../../components/BackButton';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { BOOKING_STATUS } from '../../utils/constants';
import { Flight, Booking, BookingStatus } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

const { CONFIRMED, BOARDED, NOT_BOARDED } = BOOKING_STATUS;

export const FlightBookings = () => {
  const { id } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);
        const [flightData, bookingsData] = await Promise.all([
          flightsAPI.getById(id!),
          flightsAPI.getFlightBookings(id!),
        ]);
        setFlight(flightData);
        setBookings(bookingsData);
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleBoard = async (bookingId: string, status: BookingStatus): Promise<void> => {
    setError('');
    setSuccess('');

    try {
      await bookingsAPI.board(bookingId, { status });
      setSuccess(`Booking marked as ${status}`);
      const bookingsData = await flightsAPI.getFlightBookings(id!);
      setBookings(bookingsData);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to update boarding status');
    }
  };

  if (loading) return <Loading />;
  if (error && !flight) {
    return (
      <Box>
        <ErrorMessage message={error} />
        <Button onClick={() => navigate('/flights/my')} variant="outline">
          Back to My Flights
        </Button>
      </Box>
    );
  }

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <BackButton to="/flights/my" label="Back to My Flights" />

      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1 className="dashboard-title">
          {flight ? `Bookings for ${flight.flightNumber}` : 'Flight Bookings'}
        </h1>
        <p className="dashboard-subtitle">Manage and track all bookings for this flight</p>
      </div>

      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

      {flight && (
        <div className="flight-card" style={{ marginBottom: '2rem' }}>
          <div className="flight-route">
            <div className="flight-route-item">
              <div className="flight-route-label">From</div>
              <div className="flight-route-value">{flight.source}</div>
            </div>
            <div className="flight-arrow">→</div>
            <div className="flight-route-item">
              <div className="flight-route-label">To</div>
              <div className="flight-route-value">{flight.destination}</div>
            </div>
          </div>
          <div className="flight-details" style={{ marginTop: '1.5rem' }}>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Departure</div>
              <div className="flight-detail-value">{formatDate(flight.departureTime)}</div>
            </div>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Available Seats</div>
              <div className="flight-detail-value" style={{ 
                color: flight.availableSeats < 10 ? 'var(--ss-error)' : 'var(--ss-success)' 
              }}>
                {flight.availableSeats} / {flight.totalSeats}
              </div>
            </div>
          </div>
        </div>
      )}

      {bookings.length > 0 ? (
        <div className="flight-list">
          {bookings.map((booking) => {
            const canBoard = booking.status === CONFIRMED && flight?.status === 'SCHEDULED';
            
            return (
              <div key={booking.id} className="flight-item-card">
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">
                      {booking.user?.name || 'Unknown User'}
                    </div>
                    <div className="flight-item-route">
                      {booking.user?.email || 'N/A'}
                    </div>
                  </div>
                  <Chip variant={booking.status === 'CONFIRMED' ? 'success' : 'error'}>
                    {booking.status}
                  </Chip>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{booking.seatCount} seats</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💰</span>
                    <span>Total: {formatCurrency(booking.totalPrice)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Booked: {formatDate(booking.bookedAt || booking.createdAt)}</span>
                  </div>
                </div>
                {canBoard && (
                  <div className="flight-actions" style={{ marginTop: '1rem' }}>
                    <Button
                      onClick={() => handleBoard(booking.id, BOARDED as BookingStatus)}
                      className="btn-success"
                    >
                      Mark as Boarded
                    </Button>
                    <Button
                      onClick={() => handleBoard(booking.id, NOT_BOARDED as BookingStatus)}
                      className="btn-error"
                    >
                      Mark as Not Boarded
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No bookings found</div>
          <div className="empty-state-text">There are no bookings for this flight yet.</div>
        </div>
      )}
    </Box>
  );
};

