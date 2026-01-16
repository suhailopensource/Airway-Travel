import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Input, Button, Text, Flex } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { bookingsAPI } from '../../api/bookings';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { formatDate, formatCurrency, canBookFlight } from '../../utils/helpers';

export const CreateBooking = () => {
  const { id: flightId } = useParams();
  const [flight, setFlight] = useState(null);
  const [seatCount, setSeatCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        setLoading(true);
        const flightData = await flightsAPI.getById(flightId);
        setFlight(flightData);
        
        if (!canBookFlight(flightData)) {
          setError('This flight cannot be booked. It may be cancelled, fully booked, or has already departed.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load flight details');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchFlight();
    }
  }, [flightId]);

  const handleSubmit = async (e) => {
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
        flightId,
        seatCount,
      });

      setSuccess('Booking created successfully!');
      setTimeout(() => {
        navigate(`/bookings/${booking.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!flight) {
    return (
      <Box>
        <ErrorMessage message="Flight not found" />
        <Button onClick={() => navigate('/flights/search')} variant="outline">
          Back to Search
        </Button>
      </Box>
    );
  }

  const canBook = canBookFlight(flight);
  const totalPrice = flight.price * seatCount;

  return (
    <Box css={{ maxWidth: '600px', margin: '0 auto' }}>
      <Text as="h1" size="2xl" weight="bold" css={{ marginBottom: '$lg' }}>
        Create Booking
      </Text>
      
      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

      {!canBook && (
        <ErrorMessage message="This flight cannot be booked. It may be cancelled, fully booked, or has already departed." />
      )}

      <Box css={{ padding: '$xl', marginBottom: '$xl', border: '1px solid $neutral200', borderRadius: '$lg', backgroundColor: 'white' }}>
        <Text as="h2" size="lg" weight="bold" css={{ marginBottom: '$md' }}>
          {flight.flightNumber}
        </Text>
        <Text><strong>From:</strong> {flight.source} <strong>To:</strong> {flight.destination}</Text>
        <Text><strong>Departure:</strong> {formatDate(flight.departureTime)}</Text>
        <Text><strong>Arrival:</strong> {formatDate(flight.arrivalTime)}</Text>
        <Text><strong>Available Seats:</strong> {flight.availableSeats}</Text>
        <Text><strong>Price per seat:</strong> {formatCurrency(flight.price)}</Text>
      </Box>

      <Box css={{ padding: '$xl', border: '1px solid $neutral200', borderRadius: '$lg', backgroundColor: 'white' }}>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="$lg">
            <Box>
              <Text as="label" htmlFor="seatCount" css={{ display: 'block', marginBottom: '$sm', fontWeight: 'bold' }}>
                Number of Seats
              </Text>
              <Input
                id="seatCount"
                type="number"
                min="1"
                max={flight.availableSeats}
                value={seatCount}
                onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                required
                disabled={!canBook || submitting}
                fullWidth
              />
              <Text size="sm" css={{ color: '$neutral600', marginTop: '$xs' }}>
                Maximum {flight.availableSeats} seat(s) available
              </Text>
            </Box>

            <Box css={{ backgroundColor: '$neutral50', padding: '$md', borderRadius: '$lg' }}>
              <Flex justify="between" css={{ marginBottom: '$xs' }}>
                <Text>Price per seat:</Text>
                <Text>{formatCurrency(flight.price)}</Text>
              </Flex>
              <Flex justify="between" css={{ marginBottom: '$xs' }}>
                <Text>Number of seats:</Text>
                <Text>{seatCount}</Text>
              </Flex>
              <Box css={{ borderTop: '1px solid $neutral200', margin: '$sm 0', paddingTop: '$sm' }} />
              <Flex justify="between">
                <Text weight="bold" size="lg">Total Price:</Text>
                <Text weight="bold" size="lg">{formatCurrency(totalPrice)}</Text>
              </Flex>
            </Box>

            <Flex gap="$md">
              <Button
                type="submit"
                disabled={!canBook || submitting}
                variant={canBook ? 'success' : 'disabled'}
                fullWidth
                size="lg"
              >
                {submitting ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
              <Button
                type="button"
                onClick={() => navigate(`/flights/${flightId}`)}
                variant="outline"
              >
                Cancel
              </Button>
            </Flex>
          </Flex>
        </form>
      </Box>
    </Box>
  );
};



