import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('supabase_session');
  if (!session) return null;
  try {
    const parsed = JSON.parse(session);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}
