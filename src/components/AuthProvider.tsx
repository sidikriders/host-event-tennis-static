'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthSession,
  authenticateUser,
  clearStoredSession,
  getStoredSession,
  persistSession,
} from '@/lib/auth';

interface AuthContextValue {
  user: AuthSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(getStoredSession());
    setIsReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      login: (username: string, password: string) => {
        const session = authenticateUser(username, password);
        if (!session) return false;
        persistSession(session);
        setUser(session);
        return true;
      },
      logout: () => {
        clearStoredSession();
        setUser(null);
      },
    }),
    [isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}