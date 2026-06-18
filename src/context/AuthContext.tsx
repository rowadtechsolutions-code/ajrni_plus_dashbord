'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { adminsService } from '@/services/admins.service';
import type { Admin } from '@/types';

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<Admin | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase_session');
    setAdmin(null);
  }, []);

  const fetchAdmin = useCallback(async (userId: string): Promise<Admin | null> => {
    const adminData = await adminsService.getCurrentAdmin(userId);
    setAdmin(adminData);
    return adminData;
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token && session.user) {
        localStorage.setItem('supabase_session', JSON.stringify({ access_token: session.access_token }));
        const adminData = await fetchAdmin(session.user.id);

        if (!adminData) {
          await clearSession();
        }
      } else {
        localStorage.removeItem('supabase_session');
        setAdmin(null);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('supabase_session', JSON.stringify({ access_token: session.access_token }));
      } else {
        localStorage.removeItem('supabase_session');
        setAdmin(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [clearSession, fetchAdmin]);

  const signIn = useCallback(async (email: string, password: string): Promise<Admin | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (!data.user || !data.session?.access_token) {
      await clearSession();
      return null;
    }

    localStorage.setItem('supabase_session', JSON.stringify({ access_token: data.session.access_token }));

    const adminData = await fetchAdmin(data.user.id);
    if (!adminData) {
      await clearSession();
      return null;
    }

    await adminsService.updateLastLogin(data.user.id);
    return adminData;
  }, [clearSession, fetchAdmin]);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        isSuperAdmin: admin?.role === 'super_admin',
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
