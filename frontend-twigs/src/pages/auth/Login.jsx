import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Text, Flex, FormInput } from '@sparrowengg/twigs-react';
import { useAuth } from '../../auth/AuthContext';
import { ErrorMessage } from '../../components/ErrorMessage';
import { ROLES } from '../../utils/constants';
import '../../styles/auth.css';
import '../../styles/ui-components.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.data.role === ROLES.USER) {
        navigate('/dashboard/user');
      } else if (result.data.role === ROLES.AIRWAY_PROVIDER) {
        navigate('/dashboard/provider');
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✈️</div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>
        
        <ErrorMessage message={error} onClose={() => setError('')} />
        
        <form onSubmit={handleSubmit} className="auth-form">
          <FormInput
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            css={{
              '& input': {
                fontSize: '1rem',
                padding: '0.875rem 1rem',
                border: '2px solid var(--ss-neutral-200)',
                borderRadius: '0.75rem',
                transition: 'all 0.3s ease',
                '&:focus': {
                  borderColor: 'var(--ss-primary)',
                  boxShadow: '0 0 0 4px var(--ss-primary-lighter)',
                },
              },
            }}
          />
          
          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            css={{
              '& input': {
                fontSize: '1rem',
                padding: '0.875rem 1rem',
                border: '2px solid var(--ss-neutral-200)',
                borderRadius: '0.75rem',
                transition: 'all 0.3s ease',
                '&:focus': {
                  borderColor: 'var(--ss-primary)',
                  boxShadow: '0 0 0 4px var(--ss-primary-lighter)',
                },
              },
            }}
          />
          
          <Button
            type="submit"
            disabled={loading}
            className="btn-primary"
            fullWidth
            size="lg"
            css={{
              marginTop: '0.5rem',
            }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create one here
          </Link>
        </div>
      </div>
    </div>
  );
};

