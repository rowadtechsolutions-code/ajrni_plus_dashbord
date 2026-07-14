import { NextResponse } from 'next/server';
import {
  ADMIN_MANAGEMENT_SELECT,
  requireSuperAdminFromRequest,
  validateScopeInput,
} from '@/lib/admin-management';

export async function PATCH(req: Request) {
  try {
    const auth = await requireSuperAdminFromRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json() as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';

    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    if (!fullName) return NextResponse.json({ error: 'full_name_required' }, { status: 400 });

    const { data: target, error: targetError } = await auth.value.supabaseAdmin
      .from('Admins')
      .select(ADMIN_MANAGEMENT_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (targetError) return NextResponse.json({ error: targetError.message }, { status: 400 });
    if (!target) return NextResponse.json({ error: 'admin_not_found' }, { status: 404 });

    if (target.role === 'super_admin') {
      const requestedInactive = body.is_active === false;
      const scopeChanged =
        body.data_scope !== undefined && body.data_scope !== target.data_scope ||
        body.country_id !== undefined && body.country_id !== target.country_id ||
        body.city_id !== undefined && body.city_id !== target.city_id;

      if (requestedInactive || scopeChanged) {
        return NextResponse.json({ error: 'super_admin_scope_or_status_locked' }, { status: 403 });
      }

      const { data: admin, error } = await auth.value.supabaseAdmin
        .from('Admins')
        .update({ full_name: fullName })
        .eq('id', id)
        .select(ADMIN_MANAGEMENT_SELECT)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ admin });
    }

    if (id === auth.value.currentAdmin.id && body.is_active === false) {
      return NextResponse.json({ error: 'cannot_deactivate_current_admin' }, { status: 403 });
    }

    const scope = await validateScopeInput(body, auth.value.supabaseAdmin);
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status });

    const { data: admin, error } = await auth.value.supabaseAdmin
      .from('Admins')
      .update({
        full_name: fullName,
        is_active: typeof body.is_active === 'boolean' ? body.is_active : target.is_active,
        data_scope: scope.value.data_scope,
        country_id: scope.value.country_id,
        city_id: scope.value.city_id,
      })
      .eq('id', id)
      .select(ADMIN_MANAGEMENT_SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ admin });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}