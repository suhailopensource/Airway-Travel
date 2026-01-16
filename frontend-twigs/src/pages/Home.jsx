import { Link } from 'react-router-dom';
import { Box, Text, Button, Flex } from '@sparrowengg/twigs-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../utils/constants';
import '../styles/surveysparrow-theme.css';
import '../styles/ui-components.css';

export const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Box className="home-hero">
      <Box className="home-hero-icon">✈️</Box>
      <Text as="h1" className="home-hero-title">
        Welcome to Airway Pro
      </Text>
      <Text className="home-hero-subtitle">
        Your premium solution for seamless flight booking and comprehensive airline management
      </Text>

      {isAuthenticated ? (
        <Box className="home-cta-section">
          <Text className="home-welcome-text">
            Welcome back, <strong>{user?.name || user?.email}</strong>!
          </Text>
          <Flex className="home-button-group">
            {user?.role === ROLES.USER && (
              <>
                <Button 
                  as={Link} 
                  to="/dashboard/user" 
                  size="lg"
                  className="btn-primary"
                >
                  My Dashboard
                </Button>
                <Button 
                  as={Link} 
                  to="/flights/search" 
                  size="lg"
                  className="btn-outline"
                >
                  Search Flights
                </Button>
              </>
            )}
            {user?.role === ROLES.AIRWAY_PROVIDER && (
              <>
                <Button 
                  as={Link} 
                  to="/dashboard/provider" 
                  size="lg"
                  className="btn-primary"
                >
                  Provider Dashboard
                </Button>
                <Button 
                  as={Link} 
                  to="/flights/my" 
                  size="lg"
                  className="btn-outline"
                >
                  My Flights
                </Button>
              </>
            )}
          </Flex>
        </Box>
      ) : (
        <Box className="home-cta-section">
          <Flex className="home-button-group">
            <Button 
              as={Link} 
              to="/login" 
              size="lg"
              className="btn-primary"
            >
              Sign In
            </Button>
            <Button 
              as={Link} 
              to="/register" 
              size="lg"
              className="btn-outline"
            >
              Get Started
            </Button>
          </Flex>
          <Link to="/flights/search" className="home-link-text">
            Or search flights without an account →
          </Link>
        </Box>
      )}
    </Box>
  );
};

