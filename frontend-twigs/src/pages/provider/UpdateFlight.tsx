import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Text, FormInput, Alert, AlertDescription } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { BackButton } from '../../components/BackButton';
import { canUpdateFlight, getFlightUpdateReason } from '../../utils/helpers';
import { Flight } from '../../types';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

interface FlightFormData {
  flightNumber: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: string;
  price: string;
}

export const UpdateFlight = () => {
  const { id } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [formData, setFormData] = useState<FlightFormData>({
    flightNumber: '',
    source: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    totalSeats: '',
    price: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFlight = async (): Promise<void> => {
      try {
        setLoading(true);
        const flightData = await flightsAPI.getById(id!);
        setFlight(flightData);
        
        // Note: We don't set error here, we'll show it in the UI with Alert

        const departure = new Date(flightData.departureTime);
        const arrival = new Date(flightData.arrivalTime);
        
        setFormData({
          flightNumber: flightData.flightNumber,
          source: flightData.source,
          destination: flightData.destination,
          departureTime: departure.toISOString().slice(0, 16),
          arrivalTime: arrival.toISOString().slice(0, 16),
          totalSeats: flightData.totalSeats.toString(),
          price: flightData.price.toString(),
        });
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosError.response?.data?.message || axiosError.message || 'Failed to load flight');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlight();
    }
  }, [id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const departureTime = new Date(formData.departureTime);
    const arrivalTime = new Date(formData.arrivalTime);

    if (arrivalTime <= departureTime) {
      setError('Arrival time must be after departure time');
      setSubmitting(false);
      return;
    }

    try {
      await flightsAPI.update(id!, {
        flightNumber: formData.flightNumber,
        source: formData.source,
        destination: formData.destination,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        totalSeats: parseInt(formData.totalSeats),
        price: parseFloat(formData.price),
      });

      setSuccess('Flight updated successfully!');
      setTimeout(() => {
        navigate(`/flights/${id}`);
      }, 1500);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to update flight');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (!flight) {
    return (
      <Box>
        <ErrorMessage message="Flight not found" />
        <Button onClick={() => navigate('/flights/my')} variant="outline">
          Back to My Flights
        </Button>
      </Box>
    );
  }

  const canUpdate = canUpdateFlight(flight);

  return (
    <Box className="form-container">
      <BackButton to={`/flights/${id}`} label="Back to Flight Details" />

      <div className="form-header">
        <h1 className="dashboard-title">Update Flight</h1>
        <p className="dashboard-subtitle">Modify flight details and information</p>
      </div>
      
      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

      {!canUpdate && getFlightUpdateReason(flight) && (
        <Box css={{ marginBottom: '$xl' }}>
          <Alert
            status={flight.status === 'CANCELLED' ? 'error' : 'warning'}
            css={{
              borderRadius: '12px',
              padding: '$lg',
            }}
          >
            <AlertDescription>
              <Text weight="bold" css={{ marginBottom: '$xs' }}>
                {flight.status === 'CANCELLED' ? '✗ Flight Cancelled' : '✓ Flight Completed'}
              </Text>
              <Text size="sm" css={{ marginTop: '$xs', opacity: 0.9 }}>
                {getFlightUpdateReason(flight)}
              </Text>
            </AlertDescription>
          </Alert>
        </Box>
      )}

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-title">Flight Information</div>
            <div className="form-group">
              <FormInput
                label="Flight Number"
                name="flightNumber"
                type="text"
                value={formData.flightNumber}
                onChange={handleChange}
                required
                disabled={!canUpdate}
                css={{
                  '& input': {
                    fontSize: '1rem',
                    padding: '0.75rem',
                  },
                }}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Route Details</div>
            <div className="form-grid">
              <div className="form-group">
                <FormInput
                  label="Source"
                  name="source"
                  type="text"
                  value={formData.source}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
              </div>
              
              <div className="form-group">
                <FormInput
                  label="Destination"
                  name="destination"
                  type="text"
                  value={formData.destination}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Schedule</div>
            <div className="form-grid">
              <div className="form-group">
                <FormInput
                  label="Departure Time"
                  name="departureTime"
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
                <div className="form-help-text">
                  ⏰ Select departure date and time
                </div>
              </div>
              
              <div className="form-group">
                <FormInput
                  label="Arrival Time"
                  name="arrivalTime"
                  type="datetime-local"
                  value={formData.arrivalTime}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
                <div className="form-help-text">
                  ⏰ Must be after departure time
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Pricing & Capacity</div>
            <div className="form-grid">
              <div className="form-group">
                <FormInput
                  label="Total Seats"
                  name="totalSeats"
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
                <div className="form-help-text">
                  💺 Total number of available seats
                </div>
              </div>
              
              <div className="form-group">
                <FormInput
                  label="Price per Seat"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  disabled={!canUpdate}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
                <div className="form-help-text">
                  💰 Price in your currency
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Button
              type="submit"
              disabled={!canUpdate || submitting}
              className={canUpdate ? 'btn-warning' : ''}
              css={!canUpdate ? {
                background: 'var(--ss-neutral-400)',
                color: 'white',
                border: 'none',
                flex: 1,
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'not-allowed',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:disabled': {
                  opacity: 0.6,
                },
              } : { flex: 1 }}
              size="lg"
            >
              {submitting ? 'Updating...' : 'Update Flight'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/flights/${id}`)}
              className="btn-outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Box>
  );
};

