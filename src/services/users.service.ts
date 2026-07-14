import apiClient from '@/lib/api/axios';
import { applyAdminScopeToRestQuery, recordMatchesAdminScope, type ResolvedAdminScope } from '@/lib/admin-scope';
import { getCurrentAdminScope } from './admin-scope.service';
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

function outsideScopeError() {
  return { message: 'Record is outside admin data scope', status: 403, code: 'outside_admin_scope' };
}

function applyUserScope(query: Record<string, string>, scope: ResolvedAdminScope): Record<string, string> {
  return applyAdminScopeToRestQuery(query, scope, {
    countryField: 'country',
    cityField: 'city',
  });
}

async function ensureUserPayloadInsideScope(data: Partial<User>, scope: ResolvedAdminScope): Promise<void> {
  if (!recordMatchesAdminScope(scope, { country: data.country || null, city: data.city || null })) {
    throw outsideScopeError();
  }
}

export const usersService = {
  async list(params?: UsersQueryParams): Promise<{ data: User[]; count: number }> {
    const scope = await getCurrentAdminScope();
    let query: Record<string, string> = {
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

    query = applyUserScope(query, scope);
    const countQuery = applyUserScope({ select: 'count', ...(params?.search ? { full_name: `ilike.*${params.search}*` } : {}) }, scope);

    const [dataRes, countRes] = await Promise.all([
      apiClient.get<User[]>('/Users', { params: query }),
      apiClient.get('/Users', { params: countQuery, headers: { Prefer: 'count=exact' } }),
    ]);

    return { data: dataRes.data, count: Number(countRes.headers['content-range']?.split('/')[1] || countRes.data?.length || dataRes.data.length) };
  },

  async getById(id: string): Promise<User> {
    const scope = await getCurrentAdminScope();
    const query = applyUserScope({ id: `eq.${id}`, select: '*' }, scope);
    const res = await apiClient.get<User[]>('/Users', { params: query });
    if (!res.data.length) throw { message: 'User not found', status: 404 };
    return res.data[0];
  },

  async create(data: Partial<User>): Promise<User> {
    const scope = await getCurrentAdminScope();
    await ensureUserPayloadInsideScope(data, scope);
    const res = await apiClient.post<User>('/Users', data, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data;
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const scope = await getCurrentAdminScope();
    const current = await usersService.getById(id);
    await ensureUserPayloadInsideScope({ ...current, ...data }, scope);
    const query = applyUserScope({ id: `eq.${id}` }, scope);
    const res = await apiClient.patch<User[]>('/Users', data, {
      params: query,
      headers: { Prefer: 'return=representation' },
    });
    if (!res.data.length) throw outsideScopeError();
    return res.data[0];
  },

  async delete(id: string): Promise<void> {
    const scope = await getCurrentAdminScope();
    await usersService.getById(id);
    const query = applyUserScope({ id: `eq.${id}` }, scope);
    await apiClient.delete('/Users', { params: query });
  },
};