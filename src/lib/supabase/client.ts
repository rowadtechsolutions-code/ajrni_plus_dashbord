import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StoredSession {
  access_token: string;
  refresh_token?: string;
}

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('supabase_session');
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return getStoredSession()?.access_token ?? null;
}

export async function ensureSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const stored = getStoredSession();
  if (!stored?.access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token || '',
  });

  if (error || !data.session) {
    console.error('[ensureSession] Failed to restore session:', error?.message || 'no session returned');
    return null;
  }

  return data.session;
}
