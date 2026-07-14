import { supabase, ensureSession } from '@/lib/supabase/client';
import {
  ADMIN_SCOPE_SELECT,
  SCOPE_DENY_UUID,
  applyAdminScopeToSupabaseQuery,
  canBypassAdminScope,
  resolveAdminScope,
  isAdminRole,
  isSuperAdmin,
  type AdminScopeSource,
  type ResolvedAdminScope,
} from '@/lib/admin-scope';

type CountryRow = { id: string; code: string | null };
type CityRow = { id: string; country_id: string | null; name_ar: string | null; name_en: string | null };

async function getCurrentSessionUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const currentSession = session || await ensureSession();
  const userId = currentSession?.user?.id;
  if (!userId) throw new Error('admin_session_required');
  return userId;
}

async function resolveScopeRefs(admin: AdminScopeSource): Promise<{ countryCode: string | null; cityValue: string | null }> {
  let countryId = admin.country_id || null;
  let countryCode: string | null = null;
  let cityValue: string | null = null;

  if (admin.city_id) {
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id,country_id,name_ar,name_en')
      .eq('id', admin.city_id)
      .maybeSingle<CityRow>();

    if (cityError) {
      if (process.env.NODE_ENV === 'development') console.error('[AdminScope City Resolve Error]', cityError);
      throw cityError;
    }

    if (city) {
      countryId ||= city.country_id;
      cityValue = city.name_ar || city.name_en || city.id;
    }
  }

  if (countryId) {
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('id,code')
      .eq('id', countryId)
      .maybeSingle<CountryRow>();

    if (countryError) {
      if (process.env.NODE_ENV === 'development') console.error('[AdminScope Country Resolve Error]', countryError);
      throw countryError;
    }

    countryCode = country?.code || null;
  }

  return { countryCode, cityValue };
}

export async function resolveAdminScopeForAdmin(admin: AdminScopeSource): Promise<ResolvedAdminScope> {
  const refs = await resolveScopeRefs(admin);
  return resolveAdminScope(admin, refs);
}

export async function getCurrentAdminScope(): Promise<ResolvedAdminScope> {
  const userId = await getCurrentSessionUserId();
  const { data: admin, error } = await supabase
    .from('Admins')
    .select(ADMIN_SCOPE_SELECT)
    .eq('id', userId)
    .maybeSingle<AdminScopeSource>();

  if (error || !admin || !admin.is_active || !isAdminRole(admin.role)) {
    throw new Error('admin_session_required');
  }

  const refs = await resolveScopeRefs(admin);
  return resolveAdminScope(admin, refs);
}

export async function requireCurrentSuperAdminScope(): Promise<ResolvedAdminScope> {
  const scope = await getCurrentAdminScope();
  if (!isSuperAdmin(scope.role)) {
    throw { message: 'Forbidden', status: 403, code: 'super_admin_required' };
  }
  return scope;
}
export type ScopedIdList = string[] | null;

function uniqueIds(rows: { id?: string | null }[]): string[] {
  return [...new Set(rows.map((row) => row.id).filter(Boolean) as string[])];
}

function uniqueFieldIds<T extends Record<string, unknown>>(rows: T[], field: keyof T): string[] {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean) as string[])];
}

export function scopedRestIdFilter(ids: ScopedIdList): string | null {
  if (ids === null) return null;
  if (ids.length === 0) return `eq.${SCOPE_DENY_UUID}`;
  return `in.(${ids.join(',')})`;
}

export function applyScopedRestIdFilter(
  query: Record<string, string>,
  field: string,
  ids: ScopedIdList,
): Record<string, string> {
  const filter = scopedRestIdFilter(ids);
  if (!filter) return query;
  return { ...query, [field]: filter };
}

export async function getScopedOfficeIds(scope: ResolvedAdminScope, includeBranches = true): Promise<ScopedIdList> {
  if (canBypassAdminScope(scope)) return null;
  if (scope.denyAccess) return [];

  let query = supabase
    .from('Offices')
    .select('id');

  if (!includeBranches) query = query.eq('is_sub_branch', false);
  query = applyAdminScopeToSupabaseQuery(query, scope);

  const { data, error } = await query;
  if (error) throw error;
  return uniqueIds((data || []) as { id?: string | null }[]);
}

export async function getScopedCarIds(scope: ResolvedAdminScope): Promise<ScopedIdList> {
  const officeIds = await getScopedOfficeIds(scope, true);
  if (officeIds === null) return null;
  if (officeIds.length === 0) return [];

  const { data, error } = await supabase
    .from('cars')
    .select('id')
    .in('office_id', officeIds);

  if (error) throw error;
  return uniqueIds((data || []) as { id?: string | null }[]);
}

export async function getScopedBookingRequestIds(scope: ResolvedAdminScope): Promise<ScopedIdList> {
  const officeIds = await getScopedOfficeIds(scope, true);
  if (officeIds === null) return null;
  if (officeIds.length === 0) return [];

  const { data, error } = await supabase
    .from('BookingRequestOffices')
    .select('request_id')
    .in('office_id', officeIds);

  if (error) throw error;
  return uniqueFieldIds((data || []) as { request_id?: string | null }[], 'request_id');
}

