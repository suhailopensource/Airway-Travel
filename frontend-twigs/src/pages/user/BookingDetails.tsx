import { useState, useEffect, MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Text, Flex, Chip, AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogActions, AlertDialogAction, AlertDialogCancel } from '@sparrowengg/twigs-react';
import { bookingsAPI } from '../../api/bookings';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { BackButton } from '../../components/BackButton';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { Booking } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const BookingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooking = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await bookingsAPI.getById(id!);
        setBooking(data);
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBooking();
    }
  }, [id]);

  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);

  const handleCancel = async (): Promise<void> => {
    setCancelling(true);
    setError('');
    setSuccess('');

    try {
      await bookingsAPI.cancel(id!);
      setSuccess('Booking cancelled successfully');
      const data = await bookingsAPI.getById(id!);
      setBooking(data);
      setCancelDialogOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loading />;
  if (error && !booking) {
    return (
      <Box>
        <ErrorMessage message={error} />
        <Button onClick={() => navigate('/bookings/my')} variant="outline">
          Back to My Bookings
        </Button>
      </Box>
    );
  }
  if (!booking) return <Text>Booking not found</Text>;

  const canCancel = booking.status === 'CONFIRMED' && booking.flight && new Date(booking.flight.departureTime) > new Date();

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in', maxWidth: '1000px', margin: '0 auto' }}>
      <BackButton to="/bookings/my" label="Back to My Bookings" />

      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

      {/* Booking Header */}
      <div className="flight-card" style={{ marginBottom: '1.5rem' }}>
        <div className="flight-header">
          <div>
            <div className="flight-number">Booking #{booking.id.slice(0, 8).toUpperCase()}</div>
            <div className="flight-provider">Booked on {formatDate(booking.bookedAt || booking.createdAt)}</div>
          </div>
          <Chip
            variant={booking.status === 'CONFIRMED' ? 'success' : 'error'}
            css={{ fontSize: '0.875rem' }}
          >
            {booking.status}
          </Chip>
        </div>
      </div>

      {booking.flight && (
        <div className="flight-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '1.5rem' }}>Flight Information</h3>
          <div className="flight-route">
            <div className="flight-route-item">
              <div className="flight-route-label">From</div>
              <div className="flight-route-value">{booking.flight.source}</div>
            </div>
            <div className="flight-arrow">→</div>
            <div className="flight-route-item">
              <div className="flight-route-label">To</div>
              <div className="flight-route-value">{booking.flight.destination}</div>
            </div>
          </div>
          <div className="flight-details" style={{ marginTop: '1.5rem' }}>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Flight Number</div>
              <div className="flight-detail-value">{booking.flight.flightNumber}</div>
            </div>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Departure</div>
              <div className="flight-detail-value">{formatDate(booking.flight.departureTime)}</div>
            </div>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Arrival</div>
              <div className="flight-detail-value">{formatDate(booking.flight.arrivalTime)}</div>
            </div>
            <div className="flight-detail-item">
              <div className="flight-detail-label">Airline</div>
              <div className="flight-detail-value">{booking.provider?.name || booking.flight?.provider?.name || 'Unknown'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details */}
      <div className="flight-info-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="flight-info-card">
          <div className="flight-info-label">Booking Details</div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Number of Seats</div>
              <div className="flight-info-value">{booking.seatCount}</div>
            </div>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Booked At</div>
              <div className="flight-info-value">{formatDate(booking.bookedAt || booking.createdAt)}</div>
            </div>
            {booking.provider && (
              <div>
                <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Airline Provider</div>
                <div className="flight-info-value">{booking.provider.name || booking.provider.email || 'N/A'}</div>
                {booking.provider.email && booking.provider.email !== booking.provider.name && (
                  <div className="flight-info-label" style={{ marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
                    {booking.provider.email}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flight-price-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
          <div className="flight-info-label" style={{ marginBottom: '1rem' }}>Total Amount</div>
          <div className="flight-price-value" style={{ fontSize: '2.5rem', margin: 0, border: 'none', padding: 0 }}>
            {formatCurrency(booking.totalPrice)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <Flex gap="$md" css={{ marginTop: '$xl' }}>
        {canCancel && (
          <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                className="btn-error"
                size="lg"
              >
                Cancel Booking
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone and you may be subject to cancellation fees.
              </AlertDialogDescription>
              <AlertDialogActions>
                <AlertDialogCancel asChild>
                  <Button
                    className="btn-outline"
                  >
                    Keep Booking
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-error"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogActions>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {booking.flight && (
          <Button
            onClick={() => navigate(`/flights/${booking.flight!.id}`)}
            className="btn-primary"
            size="lg"
          >
            View Flight Details
          </Button>
        )}
        <Button
          onClick={() => navigate('/bookings/my')}
          className="btn-outline"
        >
          Back to My Bookings
        </Button>
      </Flex>
    </Box>
  );
};

