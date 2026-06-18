import apiClient from '@/lib/api/axios';
import type { User } from '@/types';

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  city?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const usersService = {
  async list(params?: UsersQueryParams): Promise<{ data: User[]; count: number }> {
    const query: Record<string, string> = {
      select: '*',
    };

    if (params?.limit) {
      query.limit = String(params.limit);
      if (params?.page && params.page > 1) {
        query.offset = String((params.page - 1) * params.limit);
      }
    }

    if (params?.sort) {
      query.order = `${params.sort}.${params.order || 'asc'}`;
    }

    if (params?.search) {
      query.full_name = `ilike.*${params.search}*`;
    }

    if (params?.country) {
      query.country = `eq.${params.country}`;
    }

    if (params?.city) {
      query.city = `eq.${params.city}`;
    }

    const [dataRes, countRes] = await Promise.all([
      apiClient.get<User[]>('/Users', { params: query }),
      apiClient.get('/Users', { params: { select: 'count', ...(params?.search ? { full_name: `ilike.*${params.search}*` } : {}) }, headers: { Prefer: 'count=exact' } }),
    ]);

    return { data: dataRes.data, count: Number(countRes.headers['content-range']?.split('/')[1] || countRes.data?.length || dataRes.data.length) };
  },

  async getById(id: string): Promise<User> {
    const res = await apiClient.get<User[]>(`/Users?id=eq.${id}`);
    if (!res.data.length) throw { message: 'User not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<User>): Promise<User> {
    const res = await apiClient.post<User>('/Users', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const res = await apiClient.patch<User[]>(`/Users?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/Users?id=eq.${id}`);
  },
};
