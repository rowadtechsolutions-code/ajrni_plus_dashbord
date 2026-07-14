import apiClient from '@/lib/api/axios';
import { applyAdminScopeToRestQuery, recordMatchesAdminScope, type ResolvedAdminScope } from '@/lib/admin-scope';
import type { Office, DuplicateOfficeInfo } from '@/types';
import { getCurrentAdminScope } from './admin-scope.service';

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

function stripOfficeFormIds(data: Partial<Office>): Partial<Office> {
  const cleanData = { ...data };
  delete cleanData.country_id;
  delete cleanData.city_id;
  return cleanData;
}

function outsideScopeError() {
  return { message: 'Record is outside admin data scope', status: 403, code: 'outside_admin_scope' };
}

function applyOfficeScope(query: Record<string, string>, scope: ResolvedAdminScope): Record<string, string> {
  return applyAdminScopeToRestQuery(query, scope, {
    countryField: 'country',
    cityField: 'city',
  });
}

async function ensureOfficePayloadInsideScope(data: Partial<Office>, scope: ResolvedAdminScope): Promise<void> {
  if (!recordMatchesAdminScope(scope, { country: data.country || null, city: data.city || null })) {
    throw outsideScopeError();
  }
}

export const officesService = {
  async list(params?: OfficesQueryParams): Promise<{ data: Office[]; count: number }> {
    const scope = await getCurrentAdminScope();
    let query: Record<string, string> = {
      select: '*',
      is_sub_branch: 'eq.false',
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

    query = applyOfficeScope(query, scope);

    const res = await apiClient.get<Office[]>('/Offices', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<Office> {
    const scope = await getCurrentAdminScope();
    const query = applyOfficeScope({ id: `eq.${id}`, is_sub_branch: 'eq.false', select: '*' }, scope);
    const res = await apiClient.get<Office[]>('/Offices', { params: query });
    if (!res.data.length) throw { message: 'Office not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Office>): Promise<Office> {
    const scope = await getCurrentAdminScope();
    const cleanData = stripOfficeFormIds(data);
    await ensureOfficePayloadInsideScope(cleanData, scope);
    const res = await apiClient.post<Office>('/Offices', cleanData, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Office>): Promise<Office> {
    const scope = await getCurrentAdminScope();
    const current = await officesService.getById(id);
    const cleanData = stripOfficeFormIds(data);
    await ensureOfficePayloadInsideScope({ ...current, ...cleanData }, scope);
    const query = applyOfficeScope({ id: `eq.${id}` }, scope);
    const res = await apiClient.patch<Office[]>('/Offices', cleanData, {
      params: query,
      headers: { Prefer: 'return=representation' },
    });
    if (!res.data.length) throw outsideScopeError();
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    const scope = await getCurrentAdminScope();
    await officesService.getById(id);
    const query = applyOfficeScope({ id: `eq.${id}` }, scope);
    await apiClient.delete('/Offices', { params: query });
  },

  async toggleActive(id: string, isActive: boolean): Promise<Office> {
    return officesService.update(id, { is_active: isActive });
  },

  async getAllForDuplicateCheck(): Promise<DuplicateOfficeInfo[]> {
    const scope = await getCurrentAdminScope();
    const query = applyOfficeScope({
      select: 'id,office_name,phone_number,commercial_registration_number,is_active,country,city',
      is_sub_branch: 'eq.false',
    }, scope);

    const res = await apiClient.get<DuplicateOfficeInfo[]>('/Offices', {
      params: query,
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
