import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  Button,
  Text,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Avatar,
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Heading,
} from '@sparrowengg/twigs-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../utils/constants';
import '../styles/navbar.css';

export const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      style={{ textDecoration: 'none' }}
    >
      <Text
        css={{
          color: 'white',
          padding: '$sm $md',
          borderRadius: '$md',
          transition: 'all 0.3s ease',
          fontWeight: isActive(to) ? '600' : '400',
          backgroundColor: isActive(to) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
          borderBottom: isActive(to) ? '2px solid white' : '2px solid transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-1px)',
          },
        }}
      >
        {children}
      </Text>
    </Link>
  );

  return (
    <Box css={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Modern Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <span className="navbar-logo-icon">✈️</span>
            <span className="navbar-logo-text">Airway Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="navbar-nav">
            {isAuthenticated && (
              <>
                <Link
                  to="/flights/search"
                  className={`navbar-link ${isActive('/flights/search') ? 'active' : ''}`}
                >
                  Search Flights
                </Link>
                
                {user?.role === ROLES.USER && (
                  <>
                    <Link
                      to="/dashboard/user"
                      className={`navbar-link ${isActive('/dashboard/user') ? 'active' : ''}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/bookings/my"
                      className={`navbar-link ${isActive('/bookings/my') ? 'active' : ''}`}
                    >
                      My Bookings
                    </Link>
                  </>
                )}
                
                {user?.role === ROLES.AIRWAY_PROVIDER && (
                  <>
                    <Link
                      to="/dashboard/provider"
                      className={`navbar-link ${isActive('/dashboard/provider') ? 'active' : ''}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/flights/my"
                      className={`navbar-link ${isActive('/flights/my') ? 'active' : ''}`}
                    >
                      My Flights
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="navbar-user-section">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="navbar-user-button">
                    <div className="navbar-user-avatar">
                      {user?.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </div>
                    <span className="navbar-user-name">
                      {user?.name || user?.email?.split('@')[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="navbar-dropdown-content">
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-name">{user?.name || 'User'}</div>
                    <div className="navbar-dropdown-email">{user?.email}</div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link
                      to={user?.role === ROLES.USER ? '/profile/user' : '/profile/provider'}
                      className="navbar-dropdown-item"
                    >
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={
                        user?.role === ROLES.USER
                          ? '/dashboard/user'
                          : '/dashboard/provider'
                      }
                      className="navbar-dropdown-item"
                    >
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <div className="navbar-dropdown-separator" />
                  <DropdownMenuItem onClick={handleLogout} className="navbar-dropdown-item logout">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="navbar-user-button">
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="navbar-mobile-button"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerHeader>
          <Heading size="h4">Menu</Heading>
        </DrawerHeader>
        <DrawerBody>
          {isAuthenticated && (
            <Flex direction="column" gap="$md">
              <Link
                to="/flights/search"
                className="navbar-mobile-link"
                onClick={() => setDrawerOpen(false)}
              >
                Search Flights
              </Link>
              
              {user?.role === ROLES.USER && (
                <>
                  <Link
                    to="/dashboard/user"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/bookings/my"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link
                    to="/profile/user"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    My Profile
                  </Link>
                </>
              )}
              
              {user?.role === ROLES.AIRWAY_PROVIDER && (
                <>
                  <Link
                    to="/dashboard/provider"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/flights/my"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    My Flights
                  </Link>
                  <Link
                    to="/profile/provider"
                    className="navbar-mobile-link"
                    onClick={() => setDrawerOpen(false)}
                  >
                    My Profile
                  </Link>
                </>
              )}
            </Flex>
          )}
        </DrawerBody>
        <DrawerFooter>
          {isAuthenticated && (
            <Button
              onClick={() => {
                handleLogout();
                setDrawerOpen(false);
              }}
              color="error"
              fullWidth
            >
              Logout
            </Button>
          )}
        </DrawerFooter>
      </Drawer>

      {/* Main Content */}
      <Box
        as="main"
        css={{
          flex: 1,
          padding: '$xl',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          '@sm': { padding: '$lg' },
        }}
      >
        {children}
      </Box>

      {/* Modern Footer */}
      <Box
        as="footer"
        css={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          padding: '$xl',
          textAlign: 'center',
          marginTop: 'auto',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box css={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Text
            css={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '$sm',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            © 2026 Airway Pro
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

