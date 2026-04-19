'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { User, AuthError } from '@supabase/supabase-js';
import { Club, ClubMember, ClubRole } from '@/types';

interface UserProfile {
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  hand_preference: string | null;
  current_club_id: string | null;
}

export type AuthUser = User & UserProfile & {
  memberships: ClubMember[];
};

interface AuthContextValue {
  user: AuthUser | null;
  memberships: ClubMember[];
  activeClub: Club | null;
  activeClubRole: ClubRole | null;
  isClubAdmin: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  setCurrentClub: (clubId: string) => Promise<void>;
  getClubRole: (clubId: string) => ClubRole | null;
}
const AuthContext = createContext<AuthContextValue | null>(null);

type ClubRow = {
  id: string;
  name: string;
  tag_name: string;
  description: string | null;
  created_by_id: string;
  created_at: string;
};

type ClubMemberRow = {
  club_id: string;
  user_id: string;
  role: ClubRole;
  created_at: string;
  club: ClubRow | ClubRow[] | null;
};

function mapClubRow(row: ClubRow): Club {
  return {
    id: row.id,
    name: row.name,
    tagName: row.tag_name,
    description: row.description ?? '',
    createdById: row.created_by_id,
    createdAt: row.created_at,
  };
}

function mapClubMemberRow(row: ClubMemberRow): ClubMember | null {
  const clubRow = Array.isArray(row.club) ? row.club[0] : row.club;

  if (!clubRow) {
    return null;
  }

  return {
    clubId: row.club_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
    club: mapClubRow(clubRow),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true);
      return;
    }

    const supabase = getSupabaseClient();

    const buildAuthUser = async (baseUser: User | null): Promise<AuthUser | null> => {
      if (!baseUser) {
        return null;
      }

      const [{ data: profile, error: profileError }, { data: membershipData, error: membershipError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, email, phone, avatar_url, skill_level, hand_preference, current_club_id')
          .eq('id', baseUser.id)
          .maybeSingle(),
        supabase
          .from('club_members')
          .select('club_id, user_id, role, created_at, club:clubs(id, name, tag_name, description, created_by_id, created_at)')
          .eq('user_id', baseUser.id)
          .order('created_at', { ascending: true }),
      ]);

      if (profileError) {
        throw new Error(`Failed to load profile: ${profileError.message}`);
      }

      if (membershipError) {
        throw new Error(`Failed to load club memberships: ${membershipError.message}`);
      }

      const memberships = ((membershipData ?? []) as ClubMemberRow[])
        .map(mapClubMemberRow)
        .filter(Boolean) as ClubMember[];

      return {
        ...baseUser,
        display_name: profile?.display_name ?? null,
        email: profile?.email ?? baseUser.email ?? null,
        phone: profile?.phone ?? null,
        avatar_url: profile?.avatar_url ?? null,
        skill_level: profile?.skill_level ?? null,
        hand_preference: profile?.hand_preference ?? null,
        current_club_id: profile?.current_club_id ?? null,
        memberships,
      };
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setUser(await buildAuthUser(session?.user ?? null));
      setIsReady(true);
    };

    void initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void buildAuthUser(session?.user ?? null).then((nextUser) => {
        setUser(nextUser);
        setIsReady(true);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: {
          name: 'AuthError',
          message:
            'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          status: 500,
        } as AuthError,
      };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const logout = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  };

  const setCurrentClub = useCallback(async (clubId: string) => {
    if (!user || !isSupabaseConfigured) {
      return;
    }

    const hasMembership = user.memberships.some((membership) => membership.clubId === clubId);
    if (!hasMembership) {
      throw new Error('You do not belong to that club.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ current_club_id: clubId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to update active club: ${error.message}`);
    }

    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        current_club_id: clubId,
      };
    });
  }, [user]);

  const memberships = useMemo(() => user?.memberships ?? [], [user]);
  const activeClub = memberships.find((membership) => membership.clubId === user?.current_club_id)?.club
    ?? memberships[0]?.club
    ?? null;
  const activeClubRole = memberships.find((membership) => membership.clubId === activeClub?.id)?.role ?? null;
  const isClubAdmin = activeClubRole === 'owner' || activeClubRole === 'admin';
  const getClubRole = useCallback((clubId: string): ClubRole | null => {
    return memberships.find((membership) => membership.clubId === clubId)?.role ?? null;
  }, [memberships]);

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeClub,
        activeClubRole,
        isClubAdmin,
        isAuthenticated: !!user,
        isReady,
        login,
        logout,
        setCurrentClub,
        getClubRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};