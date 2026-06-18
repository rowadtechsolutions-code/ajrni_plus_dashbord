import apiClient from '@/lib/api/axios';
import type { Car } from '@/types';

export interface CarsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  brand?: string;
  status?: string;
  is_active?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const carsService = {
  async list(params?: CarsQueryParams): Promise<{ data: Car[]; count: number }> {
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
      query.name = `ilike.*${params.search}*`;
    }

    if (params?.office_id) {
      query.office_id = `eq.${params.office_id}`;
    }

    if (params?.brand) {
      query.brand = `eq.${params.brand}`;
    }

    if (params?.status) {
      query.status = `eq.${params.status}`;
    }

    if (params?.is_active) {
      query.is_active = `eq.${params.is_active}`;
    }

    const res = await apiClient.get<Car[]>('/cars', {
      params: { ...query, select: '*,office:office_id(*)' },
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<Car> {
    const res = await apiClient.get<Car[]>('/cars', {
      params: { id: `eq.${id}`, select: '*,office:office_id(*)' },
    });
    if (!res.data.length) throw { message: 'Car not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Car>): Promise<Car> {
    const res = await apiClient.post<Car>('/cars', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Car>): Promise<Car> {
    const res = await apiClient.patch<Car[]>(`/cars?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/cars?id=eq.${id}`);
  },

  async toggleActive(id: string, isActive: boolean): Promise<Car> {
    return carsService.update(id, { is_active: isActive });
  },

  async updateStatus(id: string, status: Car['status']): Promise<Car> {
    return carsService.update(id, { status });
  },
};
