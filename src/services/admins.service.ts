import apiClient from '@/lib/api/axios';
import type { Admin } from '@/types';

export const adminsService = {
  async getCurrentAdmin(userId: string): Promise<Admin | null> {
    try {
      console.log('[AdminsService] fetching admin for:', userId);
      const res = await apiClient.get<Admin[]>('/Admins', {
        params: { id: `eq.${userId}`, select: '*' },
      });
      console.log('[AdminsService] response:', res.status, res.data);
      return res.data?.[0] || null;
    } catch (err) {
      console.error('[AdminsService] FAILED:', JSON.stringify(err, null, 2));
      return null;
    }
  },

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await apiClient.patch(`/Admins?id=eq.${userId}`, {
        last_login: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[AdminsService] updateLastLogin FAILED:', JSON.stringify(err, null, 2));
    }
  },
};
