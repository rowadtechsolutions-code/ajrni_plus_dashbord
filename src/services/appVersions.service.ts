import { supabase, ensureSession } from '@/lib/supabase/client';
import { isSuperAdmin } from '@/lib/admin-scope';
import type { AppVersion } from '@/types';

export const appVersionsService = {
  async getAll(): Promise<AppVersion[]> {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*');

    if (error) {
      console.error('[AppVersions GetAll Error]', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(error.message || error.details || 'Failed to fetch app versions');
    }

    return data || [];
  },

  async updatePlatform(platform: string, payload: Partial<AppVersion>): Promise<AppVersion> {
    console.log('[AppVersions Save Payload]', { platform, payload });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[Admin Session]', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      sessionError: sessionError?.message || null,
    });

    let currentSession = session;
    if (!currentSession) {
      const restored = await ensureSession();
      if (!restored) {
        throw new Error('No active session found and session restoration failed. Please log out and log in again.');
      }
      currentSession = restored;
      console.log('[Session Restored]', { userId: restored.user?.id });
    }

    const { data: adminData, error: adminQueryError } = await supabase
      .from('Admins')
      .select('id,role,is_active')
      .eq('id', currentSession.user?.id)
      .maybeSingle();

    console.log('[Admin Direct Query]', {
      found: !!adminData,
      queryError: adminQueryError?.message || null,
    });

    if (!adminData || !adminData.is_active || !isSuperAdmin(adminData.role)) {
      throw new Error(
        'Admin privileges required. The current user is not found in the Admins table.',
      );
    }

    const { data, error, status } = await supabase
      .from('app_versions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('platform', platform)
      .select();

    if (error) {
      console.error('[Supabase Update Error]', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status,
      });
      throw new Error(
        error.message || error.details || 'Failed to update app version',
      );
    }

    if (!data || data.length === 0) {
      throw new Error(
        'Update returned zero rows. Check the platform value, authenticated session, and RLS update policy.',
      );
    }

    return data[0];
  },
};
