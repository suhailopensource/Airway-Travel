import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Input, Button, Text, Flex, Grid, FormInput } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { BackButton } from '../../components/BackButton';
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

export const CreateFlight = () => {
  const [formData, setFormData] = useState<FlightFormData>({
    flightNumber: '',
    source: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    totalSeats: '',
    price: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

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
    setLoading(true);

    if (parseInt(formData.totalSeats) <= 0) {
      setError('Total seats must be greater than 0');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      setError('Price must be greater than 0');
      setLoading(false);
      return;
    }

    const departureTime = new Date(formData.departureTime);
    const arrivalTime = new Date(formData.arrivalTime);

    if (arrivalTime <= departureTime) {
      setError('Arrival time must be after departure time');
      setLoading(false);
      return;
    }

    if (departureTime <= new Date()) {
      setError('Departure time must be in the future');
      setLoading(false);
      return;
    }

    try {
      const flight: Flight = await flightsAPI.create({
        flightNumber: formData.flightNumber,
        source: formData.source,
        destination: formData.destination,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        totalSeats: parseInt(formData.totalSeats),
        price: parseFloat(formData.price),
      });

      setSuccess('Flight created successfully!');
      setTimeout(() => {
        navigate(`/flights/${flight.id}`);
      }, 1500);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to create flight');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);

  return (
    <Box className="form-container">
      <BackButton to="/flights/my" label="Back to My Flights" />

      <div className="form-header">
        <h1 className="dashboard-title">Create New Flight</h1>
        <p className="dashboard-subtitle">Fill in the details to create a new flight</p>
      </div>
      
      <SuccessMessage message={success} onClose={() => setSuccess('')} />
      <ErrorMessage message={error} onClose={() => setError('')} />

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
                placeholder="e.g., AI-101"
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
                  placeholder="e.g., New York"
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
                  placeholder="e.g., Los Angeles"
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
                  min={minDateTime}
                  css={{
                    '& input': {
                      fontSize: '1rem',
                      padding: '0.75rem',
                    },
                  }}
                />
                <div className="form-help-text">
                  ⏰ Select a future date and time
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
                  min={formData.departureTime || minDateTime}
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
              disabled={loading}
              className="btn-success"
              size="lg"
            >
              {loading ? 'Creating...' : 'Create Flight'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/flights/my')}
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

