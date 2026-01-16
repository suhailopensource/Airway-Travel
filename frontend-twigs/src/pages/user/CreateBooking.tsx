import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Text, Flex, FormInput, Alert, AlertDescription, Chip } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { bookingsAPI } from '../../api/bookings';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { BackButton } from '../../components/BackButton';
import { formatDate, formatCurrency, canBookFlight } from '../../utils/helpers';
import { Flight } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const CreateBooking = () => {
  const { id: flightId } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [seatCount, setSeatCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFlight = async (): Promise<void> => {
      try {
        setLoading(true);
        const flightData = await flightsAPI.getById(flightId!);
        setFlight(flightData);
        
        if (!canBookFlight(flightData)) {
          setError('This flight cannot be booked. It may be cancelled, fully booked, or has already departed.');
        }
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load flight details');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchFlight();
    }
  }, [flightId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (seatCount <= 0) {
      setError('Seat count must be greater than 0');
      setSubmitting(false);
      return;
    }

    if (flight && seatCount > flight.availableSeats) {
      setError(`Only ${flight.availableSeats} seat(s) available`);
      setSubmitting(false);
      return;
    }

    try {
      const booking = await bookingsAPI.create({
        flightId: flightId!,
        seatCount,
      });

      setSuccess('Booking created successfully!');
      setTimeout(() => {
        navigate(`/bookings/${booking.id}`);
      }, 1500);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!flight) {
    return (
      <Box css={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <BackButton to="/flights/search" label="Back to Search" />
        <ErrorMessage message="Flight not found" />
      </Box>
    );
  }

  const canBook = canBookFlight(flight);
  const totalPrice = flight.price * seatCount;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in', maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
      <BackButton to={`/flights/${flightId}`} label="Back to Flight Details" />
      
      <div className="form-header" style={{ marginBottom: '2rem' }}>
        <Text as="h1" size="2xl" weight="bold" css={{ 
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, var(--ss-primary) 0%, var(--ss-primary-dark) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Create Booking
        </Text>
        <Text size="md" css={{ color: 'var(--ss-neutral-600)' }}>
          Review flight details and select the number of seats
        </Text>
      </div>

      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

      {!canBook && (
        <Alert status="error" css={{ marginBottom: '1.5rem' }}>
          <AlertDescription>
            This flight cannot be booked. It may be cancelled, fully booked, or has already departed.
          </AlertDescription>
        </Alert>
      )}

      {/* Flight Details Card */}
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <div className="form-section-title">Flight Information</div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <Text as="h2" size="xl" weight="bold" css={{ marginBottom: '0.25rem', color: 'var(--ss-primary)' }}>
              {flight.flightNumber}
            </Text>
            {flight.provider?.name && (
              <Text size="sm" css={{ color: 'var(--ss-neutral-600)' }}>
                Operated by {flight.provider.name}
              </Text>
            )}
          </div>
          <Chip
            variant={flight.status === 'SCHEDULED' ? 'success' : 'error'}
            css={{ fontSize: '0.875rem' }}
          >
            {flight.status}
          </Chip>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'var(--ss-neutral-50)',
          borderRadius: '0.75rem',
          marginTop: '1rem'
        }}>
          <div>
            <Text size="sm" css={{ color: 'var(--ss-neutral-600)', marginBottom: '0.5rem', fontWeight: '500' }}>
              Route
            </Text>
            <Text weight="semibold" css={{ fontSize: '1.125rem' }}>
              {flight.source} → {flight.destination}
            </Text>
          </div>
          <div>
            <Text size="sm" css={{ color: 'var(--ss-neutral-600)', marginBottom: '0.5rem', fontWeight: '500' }}>
              Departure
            </Text>
            <Text weight="semibold">
              {formatDate(flight.departureTime)}
            </Text>
          </div>
          <div>
            <Text size="sm" css={{ color: 'var(--ss-neutral-600)', marginBottom: '0.5rem', fontWeight: '500' }}>
              Arrival
            </Text>
            <Text weight="semibold">
              {formatDate(flight.arrivalTime)}
            </Text>
          </div>
          <div>
            <Text size="sm" css={{ color: 'var(--ss-neutral-600)', marginBottom: '0.5rem', fontWeight: '500' }}>
              Available Seats
            </Text>
            <Text weight="semibold" css={{ fontSize: '1.125rem', color: flight.availableSeats > 0 ? 'var(--ss-success)' : 'var(--ss-error)' }}>
              {flight.availableSeats}
            </Text>
          </div>
        </div>
      </div>

      {/* Booking Form Card */}
      <div className="form-card">
        <div className="form-section-title">Booking Details</div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <Text as="label" htmlFor="seatCount" css={{ 
              display: 'block', 
              marginBottom: '0.75rem', 
              fontWeight: '600',
              color: 'var(--ss-neutral-800)'
            }}>
              Number of Seats
            </Text>
            <FormInput
              id="seatCount"
              type="number"
              min="1"
              max={flight.availableSeats}
              value={seatCount.toString()}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSeatCount(parseInt(e.target.value) || 1)}
              required
              disabled={!canBook || submitting}
              fullWidth
            />
            <Text size="sm" css={{ color: 'var(--ss-neutral-600)', marginTop: '0.5rem' }}>
              Maximum {flight.availableSeats} seat(s) available
            </Text>
          </div>

          {/* Price Summary */}
          <div style={{ 
            backgroundColor: 'var(--ss-neutral-50)', 
            padding: '1.5rem', 
            borderRadius: '0.75rem',
            marginTop: '1.5rem',
            marginBottom: '2rem',
            border: '2px solid var(--ss-neutral-200)'
          }}>
            <Text weight="semibold" css={{ marginBottom: '1rem', color: 'var(--ss-neutral-800)' }}>
              Price Summary
            </Text>
            <Flex justify="between" css={{ marginBottom: '0.75rem' }}>
              <Text css={{ color: 'var(--ss-neutral-600)' }}>Price per seat:</Text>
              <Text weight="semibold">{formatCurrency(flight.price)}</Text>
            </Flex>
            <Flex justify="between" css={{ marginBottom: '0.75rem' }}>
              <Text css={{ color: 'var(--ss-neutral-600)' }}>Number of seats:</Text>
              <Text weight="semibold">{seatCount}</Text>
            </Flex>
            <Box css={{ 
              borderTop: '2px solid var(--ss-neutral-300)', 
              margin: '1rem 0', 
              paddingTop: '1rem' 
            }} />
            <Flex justify="between">
              <Text weight="bold" size="lg" css={{ color: 'var(--ss-primary)' }}>
                Total Price:
              </Text>
              <Text weight="bold" size="xl" css={{ color: 'var(--ss-primary)' }}>
                {formatCurrency(totalPrice)}
              </Text>
            </Flex>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Button
              type="submit"
              disabled={!canBook || submitting}
              className="btn-primary"
              fullWidth
              css={{ 
                marginBottom: '1rem',
                fontSize: '1.125rem',
                padding: '1rem 2rem',
                ...(submitting && { opacity: 0.7, cursor: 'not-allowed' })
              }}
            >
              {submitting ? 'Creating Booking...' : 'Confirm Booking'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/flights/${flightId}`)}
              className="btn-outline"
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Box>
  );
};

