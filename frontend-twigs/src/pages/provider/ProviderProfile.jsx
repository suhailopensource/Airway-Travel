import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Text,
  Flex,
  Grid,
  Avatar,
  Heading,
  Chip,
  Alert,
  AlertDescription,
  CircleLoader,
} from '@sparrowengg/twigs-react';
import { usersAPI } from '../../api/users';
import { dashboardAPI } from '../../api/dashboard';
import { useAuth } from '../../auth/AuthContext';
import { BackButton } from '../../components/BackButton';
import { formatDate } from '../../utils/helpers';
import '../../styles/surveysparrow-theme.css';
import '../../styles/ui-components.css';

export const ProviderProfile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, dashboardData] = await Promise.all([
          usersAPI.getProfile(),
          dashboardAPI.getProviderDashboard(),
        ]);
        setProfile(profileData);
        setDashboard(dashboardData);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box css={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircleLoader size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!profile) return null;

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'P';
  };

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in', maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      <BackButton to="/dashboard/provider" label="Back to Dashboard" />

      {/* Profile Header */}
      <Box className="profile-header-card">
        <Flex align="center" gap="$xl" css={{ flexWrap: 'wrap' }}>
          <Avatar
            size="3xl"
            name={profile.name || profile.email}
            className="profile-avatar"
          >
          
          </Avatar>
          <Box css={{ flex: 1, minWidth: '200px' }}>
            <Heading size="h2" className="profile-name">
              {profile.name || 'Provider'}
            </Heading>
            <Text className="profile-email">{profile.email}</Text>
     
              <Chip color="bright" className="profile-role-chip">
                Airway Provider
              </Chip>
       
          </Box>
        </Flex>
      </Box>

      {/* Stats Section */}
      <Grid columns={{ '@initial': 1, '@md': 3 }} gap="$lg" css={{ marginBottom: '$xl' }}>
        <Box className="stat-card primary">
          <div className="stat-label">Total Flights</div>
          <div className="stat-value">{dashboard?.totalFlights || 0}</div>
        </Box>
        <Box className="stat-card success">
          <div className="stat-label">Total Seats</div>
          <div className="stat-value">{dashboard?.totalSeats || 0}</div>
        </Box>
        <Box className="stat-card warning">
          <div className="stat-label">Booked Seats</div>
          <div className="stat-value">{dashboard?.bookedSeats || 0}</div>
        </Box>
      </Grid>

      {/* Account Information */}
      <Box className="profile-info-card" css={{ marginBottom: '$xl' }}>
        <Heading size="h3" className="profile-section-title">Account Information</Heading>
        <Grid columns={{ '@initial': 1, '@md': 2 }} gap="$lg">
          <Box className="profile-info-item">
            <Text className="profile-info-label">Company Name</Text>
            <Text className="profile-info-value">{profile.name || 'Not provided'}</Text>
          </Box>
          <Box className="profile-info-item">
            <Text className="profile-info-label">Email Address</Text>
            <Text className="profile-info-value">{profile.email}</Text>
          </Box>
          <Box className="profile-info-item">
            <Text className="profile-info-label">Account Type</Text>
            <Chip color="primary" css={{ marginTop: '$xs' }}>
              Airway Provider
            </Chip>
          </Box>
          <Box className="profile-info-item">
            <Text className="profile-info-label">Provider Since</Text>
            <Text className="profile-info-value">{formatDate(profile.createdAt)}</Text>
          </Box>
        </Grid>
      </Box>

      {/* Recent Flights */}
      {dashboard?.flights && dashboard.flights.length > 0 && (
        <Box css={{ marginBottom: '$xl' }}>
          <Heading size="h3" className="profile-section-title">Recent Flights</Heading>
          <div className="flight-list">
            {dashboard.flights.slice(0, 5).map((flight) => (
              <Box key={flight.flightId} className="flight-item-card">
                <Flex justify="between" align="start" css={{ marginBottom: '$md', flexWrap: 'wrap', gap: '$md' }}>
                  <Box>
                    <Text className="flight-item-title">{flight.flightNumber}</Text>
                    <Text className="flight-item-route">{flight.origin} → {flight.destination}</Text>
                  </Box>
                </Flex>
                <Flex gap="$md" css={{ marginBottom: '$md', flexWrap: 'wrap' }}>
                  <Text className="flight-item-meta-item">
                    💺 {flight.bookedSeats} / {flight.totalSeats} booked ({flight.availableSeats} available)
                  </Text>
                </Flex>
                <Flex gap="$sm" css={{ flexWrap: 'wrap' }}>
                  <Button
                    as={Link}
                    to={`/flights/${flight.flightId}/bookings`}
                    className="btn-primary"
                    size="sm"
                  >
                    View Bookings
                  </Button>
                  <Button
                    as={Link}
                    to={`/flights/${flight.flightId}/passengers`}
                    className="btn-success"
                    size="sm"
                  >
                    View Passengers
                  </Button>
                </Flex>
              </Box>
            ))}
          </div>
        </Box>
      )}

      {/* Empty State */}
      {(!dashboard || dashboard.totalFlights === 0) && (
        <Box className="empty-state">
          <Text className="empty-state-icon">✈️</Text>
          <Heading size="h4" className="empty-state-title">No flights yet</Heading>
          <Text className="empty-state-text">Create your first flight to get started!</Text>
          <Button
            as={Link}
            to="/flights/create"
            className="btn-success"
            size="lg"
            css={{ marginTop: '$lg' }}
          >
            Create Your First Flight
          </Button>
        </Box>
      )}
    </Box>
  );
};

