import { type SupabaseClient } from '@supabase/supabase-js';
import { isSuperAdmin, type AdminScopeSource } from '@/lib/admin-scope';
import { extractAdminFromRequest, getAdminClient } from '@/lib/supabase/admin';

export const ADMIN_MANAGEMENT_SELECT = 'id,created_at,full_name,email,role,is_active,last_login,data_scope,country_id,city_id';

type AdminScopeValue = 'global' | 'country' | 'city';

type AdminActionContext = {
  currentAdmin: AdminScopeSource;
  supabaseAdmin: SupabaseClient;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function requireSuperAdminFromRequest(req: Request): Promise<ValidationResult<AdminActionContext>> {
  const currentAdmin = await extractAdminFromRequest(req);
  if (!currentAdmin) {
    return { ok: false, status: 403, error: 'Admin privileges required' };
  }

  if (!isSuperAdmin(currentAdmin.role)) {
    return { ok: false, status: 403, error: 'Super admin privileges required' };
  }

  return { ok: true, value: { currentAdmin, supabaseAdmin: getAdminClient() } };
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePassword(password: string, confirmPassword: string): string | null {
  if (!password) return 'password_required';
  if (!confirmPassword) return 'confirm_password_required';
  if (password.length < 8) return 'password_too_short';
  if (!/[A-Za-z]/.test(password)) return 'password_needs_letter';
  if (!/\d/.test(password)) return 'password_needs_number';
  if (password !== confirmPassword) return 'password_mismatch';
  return null;
}

export function validateBasicAdminInput(body: Record<string, unknown>, requirePassword: boolean): ValidationResult<{
  full_name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  is_active: boolean;
}> {
  const fullName = normalizeString(body.full_name);
  const email = normalizeString(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!fullName) return { ok: false, status: 400, error: 'full_name_required' };
  if (!email || !isValidEmail(email)) return { ok: false, status: 400, error: 'valid_email_required' };

  if (requirePassword) {
    const passwordError = validatePassword(password, confirmPassword);
    if (passwordError) return { ok: false, status: 400, error: passwordError };
  }

  return {
    ok: true,
    value: {
      full_name: fullName,
      email,
      password: requirePassword ? password : undefined,
      confirmPassword: requirePassword ? confirmPassword : undefined,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
    },
  };
}

export async function validateScopeInput(
  body: Record<string, unknown>,
  supabaseAdmin: SupabaseClient,
): Promise<ValidationResult<{ data_scope: AdminScopeValue; country_id: string | null; city_id: string | null }>> {
  const dataScope = normalizeString(body.data_scope) as AdminScopeValue;
  const countryId = normalizeString(body.country_id) || null;
  const cityId = normalizeString(body.city_id) || null;

  if (!['global', 'country', 'city'].includes(dataScope)) {
    return { ok: false, status: 400, error: 'invalid_data_scope' };
  }

  if (dataScope === 'global') {
    return { ok: true, value: { data_scope: dataScope, country_id: null, city_id: null } };
  }

  if (!countryId) {
    return { ok: false, status: 400, error: 'country_id_required' };
  }

  const { data: country, error: countryError } = await supabaseAdmin
    .from('countries')
    .select('id')
    .eq('id', countryId)
    .maybeSingle<{ id: string }>();

  if (countryError) return { ok: false, status: 400, error: countryError.message };
  if (!country) return { ok: false, status: 400, error: 'country_not_found' };

  if (dataScope === 'country') {
    return { ok: true, value: { data_scope: dataScope, country_id: countryId, city_id: null } };
  }

  if (!cityId) {
    return { ok: false, status: 400, error: 'city_id_required' };
  }

  const { data: city, error: cityError } = await supabaseAdmin
    .from('cities')
    .select('id,country_id')
    .eq('id', cityId)
    .maybeSingle<{ id: string; country_id: string | null }>();

  if (cityError) return { ok: false, status: 400, error: cityError.message };
  if (!city) return { ok: false, status: 400, error: 'city_not_found' };
  if (city.country_id !== countryId) return { ok: false, status: 400, error: 'city_country_mismatch' };

  return { ok: true, value: { data_scope: dataScope, country_id: countryId, city_id: cityId } };
}

export async function assertEmailUnused(email: string, supabaseAdmin: SupabaseClient): Promise<ValidationResult<true>> {
  const { data: existingAdmin, error: adminError } = await supabaseAdmin
    .from('Admins')
    .select('id')
    .ilike('email', email)
    .maybeSingle<{ id: string }>();

  if (adminError) return { ok: false, status: 400, error: adminError.message };
  if (existingAdmin) return { ok: false, status: 409, error: 'email_already_used' };

  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) return { ok: false, status: 400, error: usersError.message };

  const existsInAuth = usersData.users.some((user) => user.email?.toLowerCase() === email);
  if (existsInAuth) return { ok: false, status: 409, error: 'email_already_used' };

  return { ok: true, value: true };
}


export function sanitizeSearch(value: string): string {
  return value.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}
