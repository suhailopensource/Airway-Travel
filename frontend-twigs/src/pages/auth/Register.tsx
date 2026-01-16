import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Text, Flex, FormInput, Select, FormLabel } from '@sparrowengg/twigs-react';
import { useAuth } from '../../auth/AuthContext';
import { ErrorMessage } from '../../components/ErrorMessage';
import { ROLES } from '../../utils/constants';
import { Role } from '../../types';
import '../../styles/auth.css';
import '../../styles/ui-components.css';

interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export const Register = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    name: '',
    role: ROLES.USER as Role,
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const result = await register(
      formData.email,
      formData.password,
      formData.name,
      formData.role
    );

    if (result.success && result.data) {
      if (result.data.role === ROLES.USER) {
        navigate('/dashboard/user');
      } else if (result.data.role === ROLES.AIRWAY_PROVIDER) {
        navigate('/dashboard/provider');
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✈️</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join Airway Pro and start your journey</p>
        </div>
        
        <ErrorMessage message={error} onClose={() => setError('')} />
        
        <form onSubmit={handleSubmit} className="auth-form">
          <FormInput
            label="Full Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
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
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
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
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            placeholder="Minimum 6 characters"
            error={formData.password && formData.password.length < 6 ? 'Password must be at least 6 characters long' : ''}
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
          
          <div className="form-group">
            <FormLabel htmlFor="role" required>
              Account Type
            </FormLabel>
            <div className="role-selection-container">
              <div 
                className={`role-option ${formData.role === ROLES.USER ? 'role-option-selected' : ''}`}
                onClick={() => setFormData({ ...formData, role: ROLES.USER as Role })}
              >
                <div className="role-option-icon">👤</div>
                <div className="role-option-content">
                  <div className="role-option-title">User (Passenger)</div>
                  <div className="role-option-description">Book flights and manage your travel bookings</div>
                </div>
                {formData.role === ROLES.USER && (
                  <div className="role-option-check">✓</div>
                )}
              </div>
              <div 
                className={`role-option ${formData.role === ROLES.AIRWAY_PROVIDER ? 'role-option-selected' : ''}`}
                onClick={() => setFormData({ ...formData, role: ROLES.AIRWAY_PROVIDER as Role })}
              >
                <div className="role-option-icon">✈️</div>
                <div className="role-option-content">
                  <div className="role-option-title">Airway Provider</div>
                  <div className="role-option-description">Create and manage flight schedules for your airline</div>
                </div>
                {formData.role === ROLES.AIRWAY_PROVIDER && (
                  <div className="role-option-check">✓</div>
                )}
              </div>
            </div>
            <input
              type="hidden"
              name="role"
              value={formData.role}
              required
            />
          </div>
          
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

