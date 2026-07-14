import { NextResponse } from 'next/server';
import { requireSuperAdminFromRequest } from '@/lib/admin-management';

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdminFromRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json() as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';

    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    if (id === auth.value.currentAdmin.id) return NextResponse.json({ error: 'cannot_delete_current_admin' }, { status: 403 });

    const { data: target, error: targetError } = await auth.value.supabaseAdmin
      .from('Admins')
      .select('id,role')
      .eq('id', id)
      .maybeSingle<{ id: string; role: string }>();

    if (targetError) return NextResponse.json({ error: targetError.message }, { status: 400 });
    if (!target) return NextResponse.json({ error: 'admin_not_found' }, { status: 404 });
    if (target.role === 'super_admin') return NextResponse.json({ error: 'cannot_delete_super_admin' }, { status: 403 });

    const { error: deleteError } = await auth.value.supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}