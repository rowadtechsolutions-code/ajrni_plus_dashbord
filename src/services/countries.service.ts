import apiClient from '@/lib/api/axios';
import type { Country } from '@/types';

export interface CountriesQueryParams {
  page?: number;
  limit?: number;
  is_active?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const countriesService = {
  async list(params?: CountriesQueryParams): Promise<{ data: Country[]; count: number }> {
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
    } else {
      query.order = 'sort_order.asc,name_ar.asc';
    }

    if (params?.is_active) {
      query.is_active = `eq.${params.is_active}`;
    }

    const res = await apiClient.get<Country[]>('/countries', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getAllActive(): Promise<Country[]> {
    const res = await apiClient.get<Country[]>('/countries', {
      params: {
        select: '*',
        is_active: 'eq.true',
        order: 'sort_order.asc,name_ar.asc',
      },
    });
    return res.data || [];
  },

  async getById(id: string): Promise<Country> {
    const res = await apiClient.get<Country[]>(`/countries?id=eq.${id}`);
    if (!res.data.length) throw { message: 'Country not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Country>): Promise<Country> {
    const res = await apiClient.post<Country>('/countries', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Country>): Promise<Country> {
    const res = await apiClient.patch<Country[]>(`/countries?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async toggleActive(id: string, isActive: boolean): Promise<Country> {
    return countriesService.update(id, { is_active: isActive });
  },

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const params: Record<string, string> = { code: `eq.${code}`, select: 'id' };
    if (excludeId) {
      params.id = `not.eq.${excludeId}`;
    }
    const res = await apiClient.get<{ id: string }[]>('/countries', { params });
    return (res.data || []).length > 0;
  },
};
