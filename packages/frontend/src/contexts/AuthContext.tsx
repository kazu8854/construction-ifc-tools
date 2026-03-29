import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@construction-ifc-tools/shared';

// Auth Context definitions
interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to easily use auth state anywhere
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Decide whether to run in mock UI mode based on VITE variable
  const isMock = import.meta.env.VITE_MOCK_AWS === 'true';

  // Attempt to load mock user from session storage
  const [user, setUser] = useState<User | null>(() => {
    if (!isMock) return null;
    const saved = sessionStorage.getItem('mockUser');
    return saved ? JSON.parse(saved) : null;
  });

  const login = () => {
    if (isMock) {
      const mockUser = {
        id: crypto.randomUUID(),
        name: 'Mock User',
        email: 'mock@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(mockUser);
      sessionStorage.setItem('mockUser', JSON.stringify(mockUser));
    } else {
      // Production AWS Cognito logic (e.g. redirect to AWS Amplify or Hosted UI)
      window.location.href = '/auth/login';
    }
  };

  const logout = () => {
    setUser(null);
    if (isMock) {
      sessionStorage.removeItem('mockUser');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isMock }}>
      {children}
    </AuthContext.Provider>
  );
}
