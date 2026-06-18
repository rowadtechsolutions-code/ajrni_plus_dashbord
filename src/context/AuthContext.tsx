'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const fetchAdmin = useCallback(async (userId: string): Promise<Admin | null> => {
    console.log('[Auth] fetchAdmin for userId:', userId);
    const adminData = await adminsService.getCurrentAdmin(userId);
    console.log('[Auth] fetchAdmin result:', adminData);
    setAdmin(adminData);
    return adminData;
  }, []);

  useEffect(() => {
    const init = async () => {
      console.log('[Auth] initializing...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] existing session:', session ? 'found' : 'none');
      if (session?.access_token) {
        localStorage.setItem('supabase_session', JSON.stringify({ access_token: session.access_token }));
        if (session.user) {
          await fetchAdmin(session.user.id);
        }
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('supabase_session', JSON.stringify({ access_token: session.access_token }));
      } else {
        localStorage.removeItem('supabase_session');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAdmin]);

  // تسجيل الدخول
  const signIn = useCallback(async (email: string, password: string): Promise<Admin | null> => {
    console.log('[Auth] signIn starting...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signIn auth error:', error);
      throw error;
    }

    if (!data.user) {
      console.error('[Auth] signIn no user returned');
      return null;
    }

    // خزّن الـ token
    const token = data.session?.access_token;
    if (token) {
      localStorage.setItem('supabase_session', JSON.stringify({ access_token: token }));
    }

    // تحقق أولاً من Admins
    const adminData = await fetchAdmin(data.user.id);
    if (adminData) {
      try {
        await adminsService.updateLastLogin(data.user.id);
      } catch {
        // silent
      }
      return adminData;
    }

    // إذا مو أدمن، تحقق من user_metadata
    const meta = data.user.user_metadata || {};
    if (meta.role === 'office') {
      return null; // سيتم التعامل معه في صفحة تسجيل الدخول
    }

    return null;
  }, [fetchAdmin]);

  // تسجيل الخروج
  const signOut = useCallback(async () => {
    console.log('[Auth] signOut');
    await supabase.auth.signOut();
    localStorage.removeItem('supabase_session');
    setAdmin(null);
  }, []);

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
