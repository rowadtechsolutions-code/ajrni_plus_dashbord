import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ADMIN_SCOPE_SELECT,
  isAdminRole,
  recordMatchesAdminScope,
  resolveAdminScope,
  type AdminScopeSource,
  type ResolvedAdminScope,
} from '@/lib/admin-scope';

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAdminByToken(token: string) {
  if (!token) return null;

  const supabaseAdmin = getAdminClient();

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: admin } = await supabaseAdmin
    .from('Admins')
    .select(ADMIN_SCOPE_SELECT)
    .eq('id', userData.user.id)
    .maybeSingle<AdminScopeSource>();

  if (!admin || !admin.is_active || !isAdminRole(admin.role)) return null;
  return admin;
}

export async function extractAdminFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  return getAdminByToken(token);
}

async function resolveServerScopeRefs(admin: AdminScopeSource, supabaseAdmin: SupabaseClient) {
  let countryId = admin.country_id || null;
  let countryCode: string | null = null;
  let cityValue: string | null = null;

  if (admin.city_id) {
    const { data: city } = await supabaseAdmin
      .from('cities')
      .select('id,country_id,name_ar,name_en')
      .eq('id', admin.city_id)
      .maybeSingle<{ id: string; country_id: string | null; name_ar: string | null; name_en: string | null }>();

    if (city) {
      countryId ||= city.country_id;
      cityValue = city.name_ar || city.name_en || city.id;
    }
  }

  if (countryId) {
    const { data: country } = await supabaseAdmin
      .from('countries')
      .select('id,code')
      .eq('id', countryId)
      .maybeSingle<{ id: string; code: string | null }>();

    countryCode = country?.code || null;
  }

  return { countryCode, cityValue };
}

export async function resolveServerAdminScope(
  admin: AdminScopeSource,
  supabaseAdmin: SupabaseClient,
): Promise<ResolvedAdminScope> {
  const refs = await resolveServerScopeRefs(admin, supabaseAdmin);
  return resolveAdminScope(admin, refs);
}

export async function validateWriteScope(
  admin: AdminScopeSource,
  record: { country?: string | null; city?: string | null } | null | undefined,
  supabaseAdmin: SupabaseClient,
): Promise<boolean> {
  const scope = await resolveServerAdminScope(admin, supabaseAdmin);
  return recordMatchesAdminScope(scope, record);
}

export async function isOfficeInsideAdminScope(
  admin: AdminScopeSource,
  officeId: string | null | undefined,
  supabaseAdmin: SupabaseClient,
): Promise<boolean> {
  if (!officeId) return false;

  const { data: office } = await supabaseAdmin
    .from('Offices')
    .select('id,country,city')
    .eq('id', officeId)
    .maybeSingle<{ id: string; country: string | null; city: string | null }>();

  return validateWriteScope(admin, office, supabaseAdmin);
}
export async function isRecordInsideAdminScope(
  admin: AdminScopeSource,
  record: { country?: string | null; city?: string | null } | null | undefined,
  supabaseAdmin: SupabaseClient,
): Promise<boolean> {
  return validateWriteScope(admin, record, supabaseAdmin);
}

