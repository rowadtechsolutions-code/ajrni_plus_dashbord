import apiClient from '@/lib/api/axios';
import type { Banner } from '@/types';

export interface BannersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: string;
  expired?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const bannersService = {
  async list(params?: BannersQueryParams): Promise<{ data: Banner[]; count: number }> {
    const query: Record<string, string> = {
      select: '*,office:office_id(*)',
    };

    if (params?.limit) {
      query.limit = String(params.limit);
      if (params?.page && params.page > 1) {
        query.offset = String((params.page - 1) * params.limit);
      }
    }

    if (params?.sort) {
      query.order = `${params.sort}.${params.order || 'desc'}`;
    }

    if (params?.search) {
      query.title = `ilike.*${params.search}*`;
    }

    if (params?.is_active) {
      query.is_active = `eq.${params.is_active}`;
    }

    if (params?.expired === 'true') {
      query.end_date = `lt.${new Date().toISOString()}`;
    }

    const res = await apiClient.get<Banner[]>('/Banners', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<Banner> {
    const res = await apiClient.get<Banner[]>('/Banners', {
      params: { id: `eq.${id}`, select: '*,office:office_id(*)' },
    });
    if (!res.data.length) throw { message: 'Banner not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Banner>): Promise<Banner> {
    const res = await apiClient.post<Banner>('/Banners', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Banner>): Promise<Banner> {
    const res = await apiClient.patch<Banner[]>(`/Banners?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/Banners?id=eq.${id}`);
  },
};
