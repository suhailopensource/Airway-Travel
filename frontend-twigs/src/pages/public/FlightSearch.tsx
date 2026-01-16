import { useState, FormEvent, ChangeEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Box, Input, Button, Text, Grid, Flex, Chip } from '@sparrowengg/twigs-react';
import { flightsAPI } from '../../api/flights';
import { Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatCurrency, canBookFlight } from '../../utils/helpers';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../utils/constants';
import { Flight, FlightSearchParams } from '../../types';
import '../../styles/surveysparrow-theme.css';

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
}

interface SearchResponse {
  flights?: Flight[];
  pagination?: PaginationInfo;
}

export const FlightSearch = () => {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    source: '',
    destination: '',
    departureDate: '',
  });
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const { isAuthenticated, isUser } = useAuth();

  const handleSearch = async (pageNum: number = 1): Promise<void> => {
    setLoading(true);
    setError('');
    
    try {
      const params: FlightSearchParams & { page?: number; limit?: number } = {
        ...searchParams,
        page: pageNum,
        limit: 10,
      };
      
      Object.keys(params).forEach(key => {
        const typedKey = key as keyof typeof params;
        if (params[typedKey] === '') {
          delete params[typedKey];
        }
      });
      
      const response = await flightsAPI.search(params) as Flight[] | SearchResponse;
      
      if (Array.isArray(response)) {
        setFlights(response);
        setPagination(null);
      } else if ('flights' in response && response.flights) {
        setFlights(response.flights);
        setPagination(response.pagination || null);
        setPage(pageNum);
      } else {
        setFlights([]);
        setPagination(null);
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(axiosError.response?.data?.message || axiosError.message || 'Failed to search flights');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleSearch(1);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchParams({
      ...searchParams,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Box css={{ animation: 'fadeIn 0.5s ease-in' }}>
      <div className="search-hero">
        <div className="search-hero-content">
          <h1>Find Your Perfect Flight</h1>
          <p>Search from thousands of flights and book your next adventure</p>
        </div>
      </div>
      
      <div className="search-form-card">
        <form onSubmit={handleSubmit}>
          <div className="search-form-grid">
            <div className="search-form-group">
              <label htmlFor="source">From</label>
              <Input
                id="source"
                name="source"
                type="text"
                value={searchParams.source || ''}
                onChange={handleChange}
                placeholder="e.g., New York"
                fullWidth
                css={{
                  padding: '$md',
                  border: '2px solid var(--ss-neutral-200)',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--ss-neutral-50)',
                  '&:focus': {
                    borderColor: 'var(--ss-primary)',
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 4px rgba(0, 130, 141, 0.1)',
                  },
                }}
              />
            </div>
            
            <div className="search-form-group">
              <label htmlFor="destination">To</label>
              <Input
                id="destination"
                name="destination"
                type="text"
                value={searchParams.destination || ''}
                onChange={handleChange}
                placeholder="e.g., Los Angeles"
                fullWidth
                css={{
                  padding: '$md',
                  border: '2px solid var(--ss-neutral-200)',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--ss-neutral-50)',
                  '&:focus': {
                    borderColor: 'var(--ss-primary)',
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 4px rgba(0, 130, 141, 0.1)',
                  },
                }}
              />
            </div>
            
            <div className="search-form-group">
              <label htmlFor="departureDate">Departure Date</label>
              <Input
                id="departureDate"
                name="departureDate"
                type="date"
                value={searchParams.departureDate || ''}
                onChange={handleChange}
                fullWidth
                css={{
                  padding: '$md',
                  border: '2px solid var(--ss-neutral-200)',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--ss-neutral-50)',
                  '&:focus': {
                    borderColor: 'var(--ss-primary)',
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 4px rgba(0, 130, 141, 0.1)',
                  },
                }}
              />
            </div>
            
            <div className="search-form-group">
              <label htmlFor="providerName">Airline</label>
              <Input
                id="providerName"
                name="providerName"
                type="text"
                value={(searchParams as Record<string, string>).providerName || ''}
                onChange={handleChange}
                placeholder="e.g., Air India"
                fullWidth
                css={{
                  padding: '$md',
                  border: '2px solid var(--ss-neutral-200)',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--ss-neutral-50)',
                  '&:focus': {
                    borderColor: 'var(--ss-primary)',
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 4px rgba(0, 130, 141, 0.1)',
                  },
                }}
              />
            </div>
            
            <div className="search-form-group">
              <label htmlFor="flightNumber">Flight Number</label>
              <Input
                id="flightNumber"
                name="flightNumber"
                type="text"
                value={(searchParams as Record<string, string>).flightNumber || ''}
                onChange={handleChange}
                placeholder="e.g., AI-101"
                fullWidth
                css={{
                  padding: '$md',
                  border: '2px solid var(--ss-neutral-200)',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--ss-neutral-50)',
                  '&:focus': {
                    borderColor: 'var(--ss-primary)',
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 4px rgba(0, 130, 141, 0.1)',
                  },
                }}
              />
            </div>
            
            <div className="search-form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                type="submit"
                disabled={loading}
                fullWidth
                size="lg"
                css={{
                  background: 'linear-gradient(135deg, var(--ss-primary) 0%, var(--ss-primary-dark) 100%)',
                  color: 'white',
                  fontWeight: '600',
                  padding: '$md',
                  borderRadius: '$md',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0, 130, 141, 0.3)',
                  '&:hover:not(:disabled)': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0, 130, 141, 0.4)',
                  },
                  '&:disabled': {
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  },
                }}
              >
                {loading ? 'Searching...' : 'Search Flights'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />

      {loading ? (
        <Loading />
      ) : flights.length > 0 ? (
        <>
          <div className="flight-list">
            {flights.map((flight) => (
              <div key={flight.id} className="flight-card">
                <div className="flight-header">
                  <div>
                    <div className="flight-number">{flight.flightNumber}</div>
                    <div className="flight-provider">{flight.provider?.name || 'Unknown Provider'}</div>
                  </div>
                  <Chip
                    variant={flight.status === 'SCHEDULED' ? 'success' : 'error'}
                    css={{ fontSize: '0.75rem' }}
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
                
                <div className="flight-details">
                  <div className="flight-detail-item">
                    <div className="flight-detail-label">Departure</div>
                    <div className="flight-detail-value">{formatDate(flight.departureTime)}</div>
                  </div>
                  <div className="flight-detail-item">
                    <div className="flight-detail-label">Arrival</div>
                    <div className="flight-detail-value">{formatDate(flight.arrivalTime)}</div>
                  </div>
                  <div className="flight-detail-item">
                    <div className="flight-detail-label">Available Seats</div>
                    <div className="flight-detail-value">
                      {flight.availableSeats} / {flight.totalSeats}
                    </div>
                  </div>
                </div>
                
                <div className="flight-price">
                  {formatCurrency(flight.price)} <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--ss-neutral-600)' }}>per seat</span>
                </div>
                
                <div className="flight-actions">
                  <Button
                    as={Link}
                    to={`/flights/${flight.id}`}
                    css={{
                      background: 'var(--ss-primary)',
                      color: 'white',
                      border: 'none',
                      '&:hover': {
                        background: 'var(--ss-primary-dark)',
                      },
                    }}
                  >
                    View Details
                  </Button>
                  {isAuthenticated && isUser && canBookFlight(flight) && (
                    <Button
                      as={Link}
                      to={`/flights/${flight.id}/book`}
                      css={{
                        background: 'var(--ss-success)',
                        color: 'white',
                        border: 'none',
                        '&:hover': {
                          background: '#059669',
                        },
                      }}
                    >
                      Book Now
                    </Button>
                  )}
                  {!canBookFlight(flight) && (
                    <Chip variant="error" css={{ fontSize: '0.875rem' }}>
                      {flight.status === 'CANCELLED' ? 'Cancelled' : 'Not Available'}
                    </Chip>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => handleSearch(page - 1)}
                disabled={!pagination.hasPrev || loading}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} results)
              </span>
              <button
                className="pagination-button"
                onClick={() => handleSearch(page + 1)}
                disabled={!pagination.hasNext || loading}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">✈️</div>
          <div className="empty-state-title">No flights found</div>
          <div className="empty-state-text">Try adjusting your search criteria to find more flights</div>
          <Button
            onClick={() => {
              setSearchParams({
                source: '',
                destination: '',
                departureDate: '',
              });
            }}
            css={{
              background: 'var(--ss-primary)',
              color: 'white',
              '&:hover': {
                background: 'var(--ss-primary-dark)',
              },
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </Box>
  );
};

