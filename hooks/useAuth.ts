import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  membershipNumber?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      // Get user data after successful login
      await checkAuth();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear user state
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login';
    }
  }, [user, loading]);

  return { user, loading, logout };
}

// Hook for admin-only routes
export function useRequireAdmin() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '/auth/login';
      } else if (user.role !== 'ADMIN') {
        // Redirect to access denied if not admin
        window.location.href = '/auth/access';
      }
    }
  }, [user, loading]);

  return { user, loading, logout };
} 