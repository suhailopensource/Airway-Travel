import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../api/auth';
import { User, LoginDto, RegisterDto, Role } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; data?: User; error?: string }>;
  register: (email: string, password: string, name: string, role: Role) => Promise<{ success: boolean; data?: User; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isUser: boolean;
  isProvider: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state from session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authAPI.getCurrentUser();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        // No active session
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; data?: User; error?: string }> => {
    try {
      const response = await authAPI.login({ email, password });
      
      // Session is stored in HttpOnly cookie, just store user data in state
      setUser(response);
      return { success: true, data: response };
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      return {
        success: false,
        error: axiosError.response?.data?.message || axiosError.message || 'Login failed',
      };
    }
  };

  const register = async (email: string, password: string, name: string, role: Role): Promise<{ success: boolean; data?: User; error?: string }> => {
    try {
      const response = await authAPI.register({ email, password, name, role });
      
      // Session is created automatically after registration
      setUser(response);
      return { success: true, data: response };
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      return {
        success: false,
        error: axiosError.response?.data?.message || axiosError.message || 'Registration failed',
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

