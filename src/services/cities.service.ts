import apiClient from '@/lib/api/axios';
import type { City } from '@/types';

export interface CitiesQueryParams {
  page?: number;
  limit?: number;
  country_id?: string;
  is_active?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const citiesService = {
  async list(params?: CitiesQueryParams): Promise<{ data: City[]; count: number }> {
    const query: Record<string, string> = {
      select: '*',
    };

    if (params?.limit) {
      query.limit = String(params.limit);
      if (params?.page && params.page > 1) {
        query.offset = String((params.page - 1) * params.limit);
      }
    }

    if (params?.country_id) {
      query.country_id = `eq.${params.country_id}`;
    }

    if (params?.sort) {
      query.order = `${params.sort}.${params.order || 'asc'}`;
    } else {
      query.order = 'sort_order.asc,name_ar.asc';
    }

    if (params?.is_active) {
      query.is_active = `eq.${params.is_active}`;
    }

    const res = await apiClient.get<City[]>('/cities', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getByCountry(countryId: string, activeOnly = true): Promise<City[]> {
    const params: Record<string, string> = {
      select: '*',
      country_id: `eq.${countryId}`,
      order: 'sort_order.asc,name_ar.asc',
    };
    if (activeOnly) {
      params.is_active = 'eq.true';
    }
    const res = await apiClient.get<City[]>('/cities', { params });
    return res.data || [];
  },

  async getById(id: string): Promise<City> {
    const res = await apiClient.get<City[]>(`/cities?id=eq.${id}`);
    if (!res.data.length) throw { message: 'City not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<City>): Promise<City> {
    const res = await apiClient.post<City>('/cities', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<City>): Promise<City> {
    const res = await apiClient.patch<City[]>(`/cities?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async toggleActive(id: string, isActive: boolean): Promise<City> {
    return citiesService.update(id, { is_active: isActive });
  },

  async getCountsByCountry(): Promise<Record<string, number>> {
    const res = await apiClient.get<Pick<City, 'country_id'>[]>('/cities', {
      params: { select: 'country_id', limit: '10000' },
    });
    const counts: Record<string, number> = {};
    for (const city of res.data || []) {
      if (city.country_id) {
        counts[city.country_id] = (counts[city.country_id] || 0) + 1;
      }
    }
    return counts;
  },

  async checkDuplicateName(countryId: string, nameAr: string, excludeId?: string): Promise<boolean> {
    const params: Record<string, string> = {
      country_id: `eq.${countryId}`,
      name_ar: `eq.${nameAr}`,
      select: 'id',
    };
    if (excludeId) {
      params.id = `not.eq.${excludeId}`;
    }
    const res = await apiClient.get<{ id: string }[]>('/cities', { params });
    return (res.data || []).length > 0;
  },
};
