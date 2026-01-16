import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { decodeToken } from '../utils/helpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Decode token to get role (for UI, backend is source of truth)
        const decoded = decodeToken(token);
        if (decoded) {
          setUser({
            ...parsedUser,
            role: decoded.role || parsedUser.role,
          });
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      
      // Store token and user data
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user || response));
      
      // Decode token to get role
      const decoded = decodeToken(response.access_token);
      const userData = {
        ...(response.user || response),
        role: decoded?.role || response.role,
      };
      
      setUser(userData);
      return { success: true, data: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed',
      };
    }
  };

  const register = async (email, password, name, role) => {
    try {
      const response = await authAPI.register({ email, password, name, role });
      
      // Store token and user data
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response));
      
      // Decode token to get role
      const decoded = decodeToken(response.access_token);
      const userData = {
        ...response,
        role: decoded?.role || response.role,
      };
      
      setUser(userData);
      return { success: true, data: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Registration failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isUser: user?.role === 'USER',
    isProvider: user?.role === 'AIRWAY_PROVIDER',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

