import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Box, Button, Text, Flex, Grid, Chip, Alert, AlertDescription } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { BackButton } from '../../components/BackButton';
import { formatDate, formatCurrency, canBookFlight } from '../../utils/helpers';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../utils/constants';
import { Flight, FlightAvailability } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const FlightDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [availability, setAvailability] = useState<FlightAvailability | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { isAuthenticated, isUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFlight = async (): Promise<void> => {
      try {
        setLoading(true);
        const [flightData, availabilityData] = await Promise.all([
          flightsAPI.getById(id!),
          flightsAPI.getAvailability(id!),
        ]);
        setFlight(flightData);
        setAvailability(availabilityData);
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load flight details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlight();
    }
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  if (error || !flight) {
    return (
      <Box>
        <ErrorMessage message={error || 'Flight not found'} />
        <Button as={Link} to="/flights/search" variant="outline">
          Back to Search
        </Button>
      </Box>
    );
  }

  const canBook = canBookFlight(flight);

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in', maxWidth: '1000px', margin: '0 auto' }}>
      <BackButton to="/flights/search" label="Back to Search" />
      
      {/* Flight Header */}
      <div className="flight-card" style={{ marginBottom: '1.5rem' }}>
        <div className="flight-header">
          <div>
            <div className="flight-number">{flight.flightNumber}</div>
            <div className="flight-provider">Operated by {flight.provider?.name || 'Unknown Provider'}</div>
          </div>
          <Chip
            variant={flight.status === 'SCHEDULED' ? 'success' : 'error'}
            css={{ fontSize: '0.875rem' }}
          >
            {flight.status}
          </Chip>
        </div>
        
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
      </div>

      {/* Flight Details Grid */}
      <div className="flight-info-grid">
        <div className="flight-info-card">
          <div className="flight-info-label">Schedule</div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Departure</div>
              <div className="flight-info-value">
                {formatDate(flight.departureTime)}
              </div>
            </div>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Arrival</div>
              <div className="flight-info-value">
                {formatDate(flight.arrivalTime)}
              </div>
            </div>
          </div>
        </div>

        <div className="flight-info-card">
          <div className="flight-info-label">Seat Information</div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Total Seats</div>
              <div className="flight-info-value">
                {flight.totalSeats}
              </div>
            </div>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Available</div>
              <div className="flight-info-value" style={{ color: 'var(--ss-success)' }}>
                {flight.availableSeats}
              </div>
            </div>
            <div>
              <div className="flight-info-label" style={{ marginBottom: '0.5rem' }}>Booked</div>
              <div className="flight-info-value">
                {flight.totalSeats - flight.availableSeats}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="flight-price-card">
        <div className="flight-price-label">Price per Seat</div>
        <div className="flight-price-value">
          {formatCurrency(flight.price)}
          <span className="flight-price-unit">per seat</span>
        </div>
      </div>

      {/* Availability Alert */}
      {availability && (
        <Box css={{ marginBottom: '$xl' }}>
          <Alert
            status={(availability.availableSeats > 0 && flight.status === 'SCHEDULED') ? 'success' : 'error'}
            css={{
              borderRadius: '12px',
              padding: '$lg',
            }}
          >
            <AlertDescription>
              <Text weight="bold" css={{ marginBottom: '$xs' }}>
                {(availability.availableSeats > 0 && flight.status === 'SCHEDULED') ? '✓ Available for Booking' : '✗ Not Available'}
              </Text>
              {!(availability.availableSeats > 0 && flight.status === 'SCHEDULED') && (
                <Text size="sm" css={{ marginTop: '$xs', opacity: 0.9 }}>
                  {flight.status === 'CANCELLED' 
                    ? 'This flight has been cancelled.'
                    : flight.availableSeats === 0
                    ? 'This flight is fully booked.'
                    : 'This flight has already departed.'}
                </Text>
              )}
            </AlertDescription>
          </Alert>
        </Box>
      )}

      {/* Action Buttons */}
      <Flex gap="$md" css={{ marginTop: '$xl' }}>
        {isAuthenticated && isUser && canBook && (
          <Button
            as={Link}
            to={`/flights/${flight.id}/book`}
            size="lg"
            className="btn-success"
            css={{ flex: 1 }}
          >
            Book This Flight
          </Button>
        )}
        {!isAuthenticated && (
          <Button
            as={Link}
            to="/login"
            size="lg"
            className="btn-primary"
            css={{ flex: 1 }}
          >
            Login to Book
          </Button>
        )}
        <Button
          as={Link}
          to="/flights/search"
          size="lg"
          className="btn-outline"
        >
          Search More Flights
        </Button>
      </Flex>
    </Box>
  );
};

