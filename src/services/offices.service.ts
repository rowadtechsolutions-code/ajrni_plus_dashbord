import apiClient from '@/lib/api/axios';
import type { Office, DuplicateOfficeInfo } from '@/types';

export interface OfficesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  city?: string;
  is_active?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const officesService = {
  async list(params?: OfficesQueryParams): Promise<{ data: Office[]; count: number }> {
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
      query.office_name = `ilike.*${params.search}*`;
    }

    if (params?.country) {
      query.country = `eq.${params.country}`;
    }

    if (params?.city) {
      query.city = `eq.${params.city}`;
    }

    if (params?.is_active) {
      query.is_active = `eq.${params.is_active}`;
    }

    const res = await apiClient.get<Office[]>('/Offices', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<Office> {
    const res = await apiClient.get<Office[]>(`/Offices?id=eq.${id}`);
    if (!res.data.length) throw { message: 'Office not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Office>): Promise<Office> {
    const res = await apiClient.post<Office>('/Offices', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Office>): Promise<Office> {
    const res = await apiClient.patch<Office[]>(`/Offices?id=eq.${id}`, data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/Offices?id=eq.${id}`);
  },

  async toggleActive(id: string, isActive: boolean): Promise<Office> {
    return officesService.update(id, { is_active: isActive });
  },

  async getAllForDuplicateCheck(): Promise<DuplicateOfficeInfo[]> {
    const res = await apiClient.get<DuplicateOfficeInfo[]>('/Offices', {
      params: {
        select: 'id,office_name,phone_number,commercial_registration_number,is_active',
      },
    });
    return res.data || [];
  },
};

export function normalizeCommercialReg(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let normalized = trimmed.replace(/\s+/g, '');
  normalized = normalized.replace(/[-–—]/g, '');
  const arabicToEnglish: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  normalized = normalized.replace(/[٠-٩]/g, (d) => arabicToEnglish[d] || d);
  return normalized;
}
