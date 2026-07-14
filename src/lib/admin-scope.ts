export type AdminRole = 'admin' | 'super_admin';
export type AdminDataScope = 'global' | 'country' | 'city';

export const ADMIN_SCOPE_SELECT = 'id,role,is_active,data_scope,country_id,city_id';
export const SCOPE_DENY_UUID = '00000000-0000-0000-0000-000000000000';

export function isAdminRole(role?: string | null): role is AdminRole {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'super_admin';
}

export interface AdminScopeSource {
  id: string;
  role: string;
  is_active: boolean;
  data_scope?: AdminDataScope | string | null;
  country_id?: string | null;
  city_id?: string | null;
}

export interface AdminScopeRefs {
  countryCode?: string | null;
  cityValue?: string | null;
}

export interface ResolvedAdminScope extends AdminScopeSource {
  role: AdminRole;
  data_scope: AdminDataScope;
  countryCode: string | null;
  cityValue: string | null;
  denyAccess: boolean;
}

export interface ScopeFieldOptions {
  idField?: string;
  countryField?: string;
  cityField?: string;
}

function normalizeDataScope(value: AdminScopeSource['data_scope']): AdminDataScope {
  return value === 'country' || value === 'city' ? value : 'global';
}

export function resolveAdminScope(source: AdminScopeSource, refs: AdminScopeRefs = {}): ResolvedAdminScope {
  if (!isAdminRole(source.role)) {
    throw new Error('admin_role_required');
  }

  const dataScope = normalizeDataScope(source.data_scope);
  const countryCode = refs.countryCode || null;
  const cityValue = refs.cityValue || null;
  const bypassScope = isSuperAdmin(source.role) || dataScope === 'global';

  return {
    ...source,
    role: source.role,
    data_scope: dataScope,
    countryCode,
    cityValue,
    denyAccess: !bypassScope && (
      (dataScope === 'country' && !countryCode) ||
      (dataScope === 'city' && (!countryCode || !cityValue))
    ),
  };
}

export function canBypassAdminScope(scope: ResolvedAdminScope): boolean {
  return isSuperAdmin(scope.role) || scope.data_scope === 'global';
}

export function isCountryLockedByAdminScope(scope?: ResolvedAdminScope | null): boolean {
  return !!scope && !canBypassAdminScope(scope);
}

export function isCityLockedByAdminScope(scope?: ResolvedAdminScope | null): boolean {
  return isCountryLockedByAdminScope(scope) && scope?.data_scope === 'city';
}

function getEqValue(filter: string | undefined): string | null {
  if (!filter?.startsWith('eq.')) return null;
  return filter.slice(3);
}

function applyEqFilter(
  query: Record<string, string>,
  field: string,
  value: string,
  idField: string,
): Record<string, string> {
  const current = query[field];
  const currentEq = getEqValue(current);
  if (current && currentEq !== value) {
    return { ...query, [idField]: `eq.${SCOPE_DENY_UUID}` };
  }
  return { ...query, [field]: `eq.${value}` };
}

export function applyAdminScopeToRestQuery(
  query: Record<string, string>,
  scope: ResolvedAdminScope,
  options: ScopeFieldOptions = {},
): Record<string, string> {
  const idField = options.idField || 'id';
  const countryField = options.countryField || 'country';
  const cityField = options.cityField || 'city';

  if (canBypassAdminScope(scope)) return query;
  if (scope.denyAccess) return { ...query, [idField]: `eq.${SCOPE_DENY_UUID}` };

  let scoped = query;
  if (scope.countryCode) {
    scoped = applyEqFilter(scoped, countryField, scope.countryCode, idField);
  }
  if (scope.data_scope === 'city' && scope.cityValue) {
    scoped = applyEqFilter(scoped, cityField, scope.cityValue, idField);
  }
  return scoped;
}

export function applyAdminScopeToSupabaseQuery<TQuery extends { eq: (field: string, value: unknown) => TQuery }>(
  query: TQuery,
  scope: ResolvedAdminScope,
  options: ScopeFieldOptions = {},
): TQuery {
  const idField = options.idField || 'id';
  const countryField = options.countryField || 'country';
  const cityField = options.cityField || 'city';

  if (canBypassAdminScope(scope)) return query;
  if (scope.denyAccess) return query.eq(idField, SCOPE_DENY_UUID);

  let scoped = query;
  if (scope.countryCode) scoped = scoped.eq(countryField, scope.countryCode);
  if (scope.data_scope === 'city' && scope.cityValue) scoped = scoped.eq(cityField, scope.cityValue);
  return scoped;
}

export function recordMatchesAdminScope(
  scope: ResolvedAdminScope,
  record: { country?: string | null; city?: string | null } | null | undefined,
): boolean {
  if (canBypassAdminScope(scope)) return true;
  if (scope.denyAccess || !record) return false;
  if (scope.countryCode && record.country !== scope.countryCode) return false;
  if (scope.data_scope === 'city' && scope.cityValue && record.city !== scope.cityValue) return false;
  return true;
}
