import { NextResponse } from 'next/server';
import {
  ADMIN_MANAGEMENT_SELECT,
  assertEmailUnused,
  requireSuperAdminFromRequest,
  validateBasicAdminInput,
  validateScopeInput,
} from '@/lib/admin-management';

export async function POST(req: Request) {
  let authUserId: string | null = null;

  try {
    const auth = await requireSuperAdminFromRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json() as Record<string, unknown>;
    const basic = validateBasicAdminInput(body, true);
    if (!basic.ok) return NextResponse.json({ error: basic.error }, { status: basic.status });

    const scope = await validateScopeInput(body, auth.value.supabaseAdmin);
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status });

    const emailCheck = await assertEmailUnused(basic.value.email, auth.value.supabaseAdmin);
    if (!emailCheck.ok) return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status });

    const { data: authData, error: authError } = await auth.value.supabaseAdmin.auth.admin.createUser({
      email: basic.value.email,
      password: basic.value.password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: basic.value.full_name,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'auth_user_create_failed' }, { status: 400 });
    }

    authUserId = authData.user.id;

    const { data: admin, error: insertError } = await auth.value.supabaseAdmin
      .from('Admins')
      .insert({
        id: authUserId,
        full_name: basic.value.full_name,
        email: basic.value.email,
        role: 'admin',
        is_active: basic.value.is_active,
        data_scope: scope.value.data_scope,
        country_id: scope.value.country_id,
        city_id: scope.value.city_id,
      })
      .select(ADMIN_MANAGEMENT_SELECT)
      .single();

    if (insertError) {
      await auth.value.supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json({ error: insertError.message, code: 'admin_insert_failed' }, { status: 400 });
    }

    return NextResponse.json({ admin }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}