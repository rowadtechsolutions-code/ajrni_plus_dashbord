import { supabase, ensureSession, getAuthToken } from '@/lib/supabase/client';
import {
  applyAdminScopeToSupabaseQuery,
  canBypassAdminScope,
  recordMatchesAdminScope,
  SCOPE_DENY_UUID,
  type AdminScopeSource,
  type ResolvedAdminScope,
} from '@/lib/admin-scope';
import type { OfficeBranch, OfficeSummary, OfficeBranchFormValues } from '@/types';
import { getCurrentAdminScope, resolveAdminScopeForAdmin } from './admin-scope.service';

function mapBranch(raw: Record<string, unknown>): OfficeBranch {
  const parentOffice = Array.isArray(raw.parent_office)
    ? (raw.parent_office[0] as OfficeSummary | undefined) || null
    : (raw.parent_office as OfficeSummary | null);
  const linkedOffice = Array.isArray(raw.linked_office)
    ? (raw.linked_office[0] as OfficeSummary | undefined) || null
    : (raw.linked_office as OfficeSummary | null);
  const { parent_office, linked_office, ...rest } = raw;
  return { ...rest, parent_office: parentOffice, linked_office: linkedOffice } as unknown as OfficeBranch;
}

async function ensureAdminSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  let currentSession = session;
  if (!currentSession) {
    const restored = await ensureSession();
    if (!restored) throw new Error('admin_session_required');
    currentSession = restored;
  }
  const adminId = currentSession.user?.id;
  if (!adminId) throw new Error('admin_session_required');
  await getCurrentAdminScope();
  return adminId;
}

const BRANCH_SELECT = `
  id,
  created_at,
  parent_office_id,
  branch_name,
  email,
  phone_number,
  country,
  city,
  auth_user_id,
  linked_office_id,
  is_active,

  parent_office:Offices!office_branches_parent_office_fkey (
    id,
    office_name,
    commercial_registration_number,
    country,
    city,
    email,
    phone_number,
    bio,
    image,
    cover,
    is_active
  ),

  linked_office:Offices!office_branches_linked_office_id_fkey (
    id,
    office_name,
    country,
    city,
    email,
    phone_number,
    bio,
    image,
    cover,
    is_active
  )
`;

const headersWithAuth = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};


type ApiErrorResult = { message?: string; code?: string; rolledBack?: boolean; debug?: unknown };

const handleError = (res: Response, result: ApiErrorResult) => {
  const error = new Error(result.message || 'Unknown error') as Error & {
    code?: string;
    rolledBack?: boolean;
    debug?: unknown;
  };
  error.code = result.code || '';
  error.rolledBack = result.rolledBack;
  error.debug = result.debug || '';
  throw error;
};

async function getScopeForAdmin(currentAdmin?: AdminScopeSource | null): Promise<ResolvedAdminScope> {
  if (!currentAdmin) throw new Error('admin_scope_required');
  return resolveAdminScopeForAdmin(currentAdmin);
}

async function getScopedLinkedOfficeIds(scope: ResolvedAdminScope): Promise<string[] | null> {
  if (canBypassAdminScope(scope)) return null;
  if (scope.denyAccess) return [];

  let query = supabase
    .from('Offices')
    .select('id');

  if (scope.countryCode) query = query.eq('country', scope.countryCode);
  if (scope.data_scope === 'city' && scope.cityValue) query = query.eq('city', scope.cityValue);

  const { data, error } = await query;
  if (error) throw error;
  return [...new Set(((data || []) as { id: string }[]).map((office) => office.id).filter(Boolean))];
}

function applyLinkedOfficeScope<TQuery extends { in: (field: string, values: string[]) => TQuery; eq: (field: string, value: unknown) => TQuery }>(
  query: TQuery,
  linkedOfficeIds: string[] | null,
): TQuery {
  if (linkedOfficeIds === null) return query;
  if (linkedOfficeIds.length === 0) return query.eq('linked_office_id', SCOPE_DENY_UUID);
  return query.in('linked_office_id', linkedOfficeIds);
}

function assertBranchInsideScope(scope: ResolvedAdminScope, branch: OfficeBranch): void {
  const record = branch.linked_office || { country: branch.country, city: branch.city };
  if (!recordMatchesAdminScope(scope, record)) {
    throw Object.assign(new Error('Branch is outside admin data scope'), {
      status: 403,
      code: 'outside_admin_scope',
    });
  }
}

export const officeBranchesService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: string;
    parent_office_id?: string;
    country?: string;
    city?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    currentAdmin?: AdminScopeSource | null;
  }): Promise<{ data: OfficeBranch[]; count: number }> {
    const scope = await getScopeForAdmin(params?.currentAdmin);
    const linkedOfficeIds = await getScopedLinkedOfficeIds(scope);

    let query = supabase
      .from('OfficeBranches')
      .select(BRANCH_SELECT, { count: 'exact' });

    query = applyLinkedOfficeScope(query, linkedOfficeIds);

    if (params?.search) {
      const sq = params.search;
      const branchFields = `branch_name.ilike.%${sq}%,email.ilike.%${sq}%,phone_number.ilike.%${sq}%,country.ilike.%${sq}%,city.ilike.%${sq}%`;

      const { data: matchingOffices } = await supabase
        .from('Offices')
        .select('id')
        .or(`office_name.ilike.%${sq}%,commercial_registration_number.ilike.%${sq}%`)
        .limit(50);

      if (matchingOffices && matchingOffices.length > 0) {
        const officeIds = matchingOffices.map((o: { id: string }) => o.id);
        query = query.or(
          `parent_office_id.in.(${officeIds.join(',')}),${branchFields}`,
        );
      } else {
        query = query.or(branchFields);
      }
    }

    if (params?.is_active && params.is_active !== 'all') {
      query = query.eq('is_active', params.is_active === 'true');
    }

    if (params?.parent_office_id) {
      query = query.eq('parent_office_id', params.parent_office_id);
    }

    if (params?.country) {
      query = query.eq('country', params.country);
    }

    if (params?.city) {
      query = query.eq('city', params.city);
    }

    if (params?.limit) {
      query = query.range(
        ((params.page || 1) - 1) * params.limit,
        (params.page || 1) * params.limit - 1,
      );
    }

    const sortCol = params?.sort || 'created_at';
    const sortDir = params?.order || 'desc';
    query = query.order(sortCol, { ascending: sortDir === 'asc' });

    const { data, error, count } = await query;

    if (error) {
      console.error('[OfficeBranches List Error]', JSON.stringify(error, null, 2));
      throw error;
    }

    return { data: (data || []).map(mapBranch), count: count || 0 };
  },

  async getById(id: string): Promise<OfficeBranch> {
    const scope = await getCurrentAdminScope();
    const { data, error } = await supabase
      .from('OfficeBranches')
      .select(BRANCH_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('not_found');
    const branch = mapBranch(data as Record<string, unknown>);
    assertBranchInsideScope(scope, branch);
    return branch;
  },

  async create(payload: OfficeBranchFormValues): Promise<OfficeBranch> {
    await ensureAdminSession();

    const res = await fetch('/api/create-office-branch', {
      method: 'POST',
      headers: headersWithAuth(),
      body: JSON.stringify({
        parent_office_id: payload.parent_office_id,
        branch_name: payload.branch_name.trim(),
        email: payload.email?.trim().toLowerCase() || null,
        phone_number: payload.phone_number?.trim() || null,
        country: payload.country || null,
        city: payload.city || null,
        bio: payload.bio?.trim() || null,
        image: payload.image || null,
        cover: payload.cover || null,
        is_active: payload.is_active,
        login_email: payload.email?.trim().toLowerCase() || null,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      const error = new Error(result.message || 'Failed to create branch') as Error & {
        code?: string;
        rolledBack?: boolean;
        debug?: unknown;
      };
      error.code = result.code || '';
      error.rolledBack = result.rolledBack;
      error.debug = result.debug || '';
      throw error;
    }

    return result.branch as OfficeBranch;
  },

  async update(id: string, payload: Partial<OfficeBranchFormValues>): Promise<OfficeBranch> {
    await ensureAdminSession();

    const res = await fetch('/api/office-branch/update', {
      method: 'PATCH',
      headers: headersWithAuth(),
      body: JSON.stringify({ id, branch_name: payload.branch_name, phone_number: payload.phone_number, country: payload.country, city: payload.city, bio: payload.bio, image: payload.image, cover: payload.cover, is_active: payload.is_active }),
    });

    const responseBody = await res.json().catch(() => null);

    if (!res.ok) {
      const error = new Error(responseBody?.message || 'فشل تعديل الفرع') as Error & { code?: string; debug?: unknown; status?: number };
      error.code = responseBody?.code || '';
      error.debug = responseBody?.debug;
      error.status = res.status;
      throw error;
    }

    return responseBody?.branch as OfficeBranch;
  },

  async delete(id: string): Promise<void> {
    await ensureAdminSession();

    const res = await fetch('/api/office-branch/delete', {
      method: 'POST',
      headers: headersWithAuth(),
      body: JSON.stringify({ id }),
    });

    const result = await res.json();

    if (!res.ok) {
      handleError(res, result);
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<OfficeBranch> {
    await ensureAdminSession();

    const res = await fetch('/api/office-branch/toggle', {
      method: 'PATCH',
      headers: headersWithAuth(),
      body: JSON.stringify({ id, is_active: isActive }),
    });

    const result = await res.json();

    if (!res.ok) {
      handleError(res, result);
    }

    return officeBranchesService.getById(id);
  },

  async resendInvite(id: string): Promise<void> {
    await ensureAdminSession();

    const res = await fetch('/api/office-branch/resend-invite', {
      method: 'POST',
      headers: headersWithAuth(),
      body: JSON.stringify({ id }),
    });

    const result = await res.json();

    if (!res.ok) {
      handleError(res, result);
    }
  },

  async getOfficesForBranchSelect(): Promise<OfficeSummary[]> {
    const scope = await getCurrentAdminScope();
    let query = supabase
      .from('Offices')
      .select(`
        id,
        office_name,
        commercial_registration_number,
        country,
        city,
        image,
        is_active
      `)
      .eq('is_sub_branch', false);

    query = applyAdminScopeToSupabaseQuery(query, scope);
    const { data, error } = await query.order('office_name', { ascending: true });

    if (error) throw error;
    return (data as OfficeSummary[]) || [];
  },

  async getBranchesByOfficeId(officeId: string): Promise<OfficeBranch[]> {
    const scope = await getCurrentAdminScope();
    const linkedOfficeIds = await getScopedLinkedOfficeIds(scope);
    let query = supabase
      .from('OfficeBranches')
      .select(`
        id,
        created_at,
        parent_office_id,
        branch_name,
        email,
        phone_number,
        country,
        city,
        auth_user_id,
        linked_office_id,
        is_active
      `)
      .eq('parent_office_id', officeId);

    query = applyLinkedOfficeScope(query, linkedOfficeIds);
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data as OfficeBranch[]) || [];
  },

  async getStats(currentAdmin?: AdminScopeSource | null): Promise<{ total: number; active: number; inactive: number; officesWithBranches: number }> {
    const scope = await getScopeForAdmin(currentAdmin);
    const linkedOfficeIds = await getScopedLinkedOfficeIds(scope);
    let query = supabase
      .from('OfficeBranches')
      .select('id, is_active, parent_office_id, linked_office_id');

    query = applyLinkedOfficeScope(query, linkedOfficeIds);
    const { data, error } = await query;
    if (error) throw error;

    const list = data || [];
    return {
      total: list.length,
      active: list.filter((b) => b.is_active).length,
      inactive: list.filter((b) => !b.is_active).length,
      officesWithBranches: new Set(list.map((b) => b.parent_office_id)).size,
    };
  },

  async getDistinctCountryCodes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('OfficeBranches')
      .select('country')
      .not('country', 'is', null)
      .order('country', { ascending: true });

    if (error) throw error;
    return [...new Set((data as { country: string }[]).map((r) => r.country))];
  },

  async getDistinctCityIds(): Promise<string[]> {
    const { data, error } = await supabase
      .from('OfficeBranches')
      .select('city')
      .not('city', 'is', null)
      .order('city', { ascending: true });

    if (error) throw error;
    return [...new Set((data as { city: string }[]).map((r) => r.city))];
  },
};
