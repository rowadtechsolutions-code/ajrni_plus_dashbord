import { createClient } from '@supabase/supabase-js';

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
    .select('id,role,is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!admin || !admin.is_active || admin.role !== 'admin') return null;
  return admin;
}

export async function extractAdminFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  return getAdminByToken(token);
}
