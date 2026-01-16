import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Text, Flex, Chip } from '@sparrowengg/twigs-react';
import { bookingsAPI } from '../../api/bookings';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/helpers';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await bookingsAPI.getMyBookings();
        setBookings(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <h1 className="dashboard-title">My Bookings</h1>
        <p className="dashboard-subtitle">View and manage all your flight bookings</p>
      </div>

      {bookings.length > 0 ? (
        <div className="flight-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="flight-item-card">
              <div className="flight-item-header">
                <div>
                  <div className="flight-item-title">{booking.flight?.flightNumber || 'N/A'}</div>
                  {booking.flight && (
                    <div className="flight-item-route">
                      {booking.flight.source} → {booking.flight.destination}
                    </div>
                  )}
                </div>
                <Chip
                  variant={booking.status === 'CONFIRMED' ? 'success' : 'error'}
                  css={{ fontSize: '0.75rem' }}
                >
                  {booking.status}
                </Chip>
              </div>
              
              {booking.flight && (
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>Departure: {formatDate(booking.flight.departureTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>🛬</span>
                    <span>Arrival: {formatDate(booking.flight.arrivalTime)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{booking.seatCount} seats</span>
                  </div>
                  {booking.provider && (
                    <div className="flight-item-meta-item">
                      <span>✈️</span>
                      <span>Airline: {booking.provider.name || booking.provider.email || 'N/A'}</span>
                    </div>
                  )}
                  <div className="flight-item-meta-item">
                    <span>📆</span>
                    <span>Booked: {formatDate(booking.bookedAt || booking.createdAt)}</span>
                  </div>
                </div>
              )}
              
              <div className="flight-item-price">
                Total: {formatCurrency(booking.totalPrice)}
              </div>
              
              <div className="flight-actions">
                <Button
                  as={Link}
                  to={`/bookings/${booking.id}`}
                  className="btn-primary"
                >
                  View Details
                </Button>
                {booking.flight && (
                  <Button
                    as={Link}
                    to={`/flights/${booking.flight.id}`}
                    className="btn-outline"
                  >
                    View Flight
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">✈️</div>
          <div className="empty-state-title">No bookings yet</div>
          <div className="empty-state-text">Start searching for flights and book your next trip!</div>
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

