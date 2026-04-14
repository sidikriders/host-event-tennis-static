'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { User, AuthError } from '@supabase/supabase-js';

interface UserProfile {
  display_name: string | null;
  skill_level: string | null;
  hand_preference: string | null;
}

export type AuthUser = User & UserProfile;

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  // Use 'AuthError | null' instead of 'any'
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const buildAuthUser = async (baseUser: User | null): Promise<AuthUser | null> => {
      if (!baseUser) {
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, skill_level, hand_preference')
        .eq('id', baseUser.id)
        .maybeSingle();

      return {
        ...baseUser,
        display_name: profile?.display_name ?? null,
        skill_level: profile?.skill_level ?? null,
        hand_preference: profile?.hand_preference ?? null,
      };
    };

    // 1. Check for an existing session on load
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setUser(await buildAuthUser(session?.user ?? null));
      setIsReady(true);
    };

    void initializeAuth();

    // 2. Listen for changes (Sign-in, Sign-out, Token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void buildAuthUser(session?.user ?? null).then((nextUser) => {
        setUser(nextUser);
        setIsReady(true);
      });
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};