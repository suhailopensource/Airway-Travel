import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Text, Flex, Grid, Chip } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { BackButton } from '../../components/BackButton';
import { formatDate, formatCurrency } from '../../utils/helpers';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const PassengerList = () => {
  const { id } = useParams();
  const [passengerData, setPassengerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        setLoading(true);
        const data = await flightsAPI.getFlightPassengers(id);
        setPassengerData(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load passenger list');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPassengers();
    }
  }, [id]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <Box>
        <ErrorMessage message={error} />
        <Button onClick={() => navigate('/flights/my')} variant="outline">
          Back to My Flights
        </Button>
      </Box>
    );
  }
  if (!passengerData) return <Text>No data available</Text>;

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <BackButton to="/flights/my" label="Back to My Flights" />

      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1 className="dashboard-title">
          Passenger List - {passengerData.flightNumber}
        </h1>
        <p className="dashboard-subtitle">View all passengers and booking statistics for this flight</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card primary">
          <div className="stat-label">Route</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {passengerData.source} → {passengerData.destination}
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Departure</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>
            {formatDate(passengerData.departureTime)}
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Total Passengers</div>
          <div className="stat-value">{passengerData.totalPassengers}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {formatCurrency(passengerData.totalRevenue)}
          </div>
        </div>
      </div>

      <div className="flight-card" style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--ss-neutral-600)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Seats Booked
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--ss-primary)' }}>
            {passengerData.totalSeatsBooked}
          </div>
        </div>
      </div>

      {passengerData.passengers && passengerData.passengers.length > 0 ? (
        <div>
          <h2 className="section-title">Passenger Details</h2>
          <div className="flight-list">
            {passengerData.passengers.map((passenger, index) => (
              <div key={passenger.userId} className="flight-item-card">
                <div className="flight-item-header">
                  <div>
                    <div className="flight-item-title">
                      {index + 1}. {passenger.name}
                    </div>
                    <div className="flight-item-route">{passenger.email}</div>
                  </div>
                  <Chip variant={passenger.status === 'CONFIRMED' ? 'success' : 'error'}>
                    {passenger.status}
                  </Chip>
                </div>
                <div className="flight-item-meta">
                  <div className="flight-item-meta-item">
                    <span>💺</span>
                    <span>{passenger.totalSeats} seats</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>💰</span>
                    <span>Total: {formatCurrency(passenger.totalAmount)}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>📋</span>
                    <span>{passenger.bookingCount} booking{passenger.bookingCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flight-item-meta-item">
                    <span>📅</span>
                    <span>First booking: {formatDate(passenger.firstBookingDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No passengers found</div>
          <div className="empty-state-text">There are no passengers booked for this flight yet.</div>
        </div>
      )}
    </Box>
  );
};
