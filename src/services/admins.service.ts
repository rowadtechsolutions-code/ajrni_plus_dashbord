import apiClient from '@/lib/api/axios';
import { isAdminRole } from '@/lib/admin-scope';
import { getAuthToken } from '@/lib/supabase/client';
import type { Admin } from '@/types';

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminCreatePayload {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  data_scope: 'global' | 'country' | 'city';
  country_id: string | null;
  city_id: string | null;
  is_active: boolean;
}

export interface AdminUpdatePayload {
  id: string;
  full_name: string;
  data_scope: 'global' | 'country' | 'city';
  country_id: string | null;
  city_id: string | null;
  is_active: boolean;
}

type AdminApiResponse<T> = T & { error?: string };

function adminApiHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function adminApiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...adminApiHeaders(),
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({})) as AdminApiResponse<T>;
  if (!res.ok) {
    throw Object.assign(new Error(body.error || 'admins_api_failed'), { status: res.status });
  }

  return body as T;
}

export const adminsService = {
  async getCurrentAdmin(userId: string): Promise<Admin | null> {
    try {
      console.log('[AdminsService] fetching admin for:', userId);
      const res = await apiClient.get<Admin[]>('/Admins', {
        params: { id: `eq.${userId}`, select: '*' },
      });
      console.log('[AdminsService] response:', res.status, res.data);
      const admin = res.data?.[0] || null;
      if (!admin || !admin.is_active || !isAdminRole(admin.role)) return null;
      return admin;
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

  async list(params?: AdminListParams): Promise<{ data: Admin[]; count: number }> {
    const query = new URLSearchParams();
    query.set('page', String(params?.page || 1));
    query.set('limit', String(params?.limit || 20));
    if (params?.search?.trim()) query.set('search', params.search.trim());
    return adminApiRequest<{ data: Admin[]; count: number }>(`/api/admins?${query.toString()}`);
  },

  async create(payload: AdminCreatePayload): Promise<Admin> {
    const res = await adminApiRequest<{ admin: Admin }>('/api/admins/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.admin;
  },

  async update(payload: AdminUpdatePayload): Promise<Admin> {
    const res = await adminApiRequest<{ admin: Admin }>('/api/admins/update', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.admin;
  },

  async toggle(id: string, isActive: boolean): Promise<Admin> {
    const res = await adminApiRequest<{ admin: Admin }>('/api/admins/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ id, is_active: isActive }),
    });
    return res.admin;
  },

  async delete(id: string): Promise<void> {
    await adminApiRequest<{ success: boolean }>('/api/admins/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },
};