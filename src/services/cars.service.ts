import apiClient from '@/lib/api/axios';
import { SCOPE_DENY_UUID, type ResolvedAdminScope } from '@/lib/admin-scope';
import {
  applyScopedRestIdFilter,
  getCurrentAdminScope,
  getScopedOfficeIds,
  type ScopedIdList,
} from './admin-scope.service';
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

function outsideScopeError() {
  return { message: 'Record is outside admin data scope', status: 403, code: 'outside_admin_scope' };
}

function applyOfficeScope(
  query: Record<string, string>,
  officeIds: ScopedIdList,
  requestedOfficeId?: string,
): Record<string, string> {
  if (requestedOfficeId) {
    if (officeIds !== null && !officeIds.includes(requestedOfficeId)) {
      return { ...query, office_id: `eq.${SCOPE_DENY_UUID}` };
    }
    return { ...query, office_id: `eq.${requestedOfficeId}` };
  }

  return applyScopedRestIdFilter(query, 'office_id', officeIds);
}

async function getCarScope(scope: ResolvedAdminScope) {
  return getScopedOfficeIds(scope, true);
}

async function ensureCarInsideScope(id: string): Promise<{ scope: ResolvedAdminScope; officeIds: ScopedIdList }> {
  const scope = await getCurrentAdminScope();
  const officeIds = await getCarScope(scope);
  const query = applyOfficeScope({ id: `eq.${id}`, select: 'id,office_id' }, officeIds);
  const res = await apiClient.get<Pick<Car, 'id' | 'office_id'>[]>('/cars', { params: query });
  if (!res.data.length) throw outsideScopeError();
  return { scope, officeIds };
}

async function ensureOfficeInsideScope(officeId: string | undefined | null): Promise<void> {
  const scope = await getCurrentAdminScope();
  const officeIds = await getCarScope(scope);
  if (officeIds !== null && (!officeId || !officeIds.includes(officeId))) {
    throw outsideScopeError();
  }
}

export const carsService = {
  async list(params?: CarsQueryParams): Promise<{ data: Car[]; count: number }> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getCarScope(scope);
    let query: Record<string, string> = {
      select: '*,office:office_id(*)',
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

    query = applyOfficeScope(query, officeIds, params?.office_id);

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
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<Car> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getCarScope(scope);
    const query = applyOfficeScope({ id: `eq.${id}`, select: '*,office:office_id(*)' }, officeIds);
    const res = await apiClient.get<Car[]>('/cars', { params: query });
    if (!res.data.length) throw { message: 'Car not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<Car>): Promise<Car> {
    await ensureOfficeInsideScope(data.office_id);
    const res = await apiClient.post<Car>('/cars', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<Car>): Promise<Car> {
    const { officeIds } = await ensureCarInsideScope(id);
    if (data.office_id) await ensureOfficeInsideScope(data.office_id);
    const query = applyOfficeScope({ id: `eq.${id}` }, officeIds);
    const res = await apiClient.patch<Car[]>('/cars', data, {
      params: query,
      headers: { Prefer: 'return=representation' },
    });
    if (!res.data.length) throw outsideScopeError();
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    const { officeIds } = await ensureCarInsideScope(id);
    const query = applyOfficeScope({ id: `eq.${id}` }, officeIds);
    await apiClient.delete('/cars', { params: query });
  },

  async toggleActive(id: string, isActive: boolean): Promise<Car> {
    return carsService.update(id, { is_active: isActive });
  },

  async updateStatus(id: string, status: Car['status']): Promise<Car> {
    return carsService.update(id, { status });
  },
};