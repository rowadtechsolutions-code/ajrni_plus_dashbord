import { NextResponse } from 'next/server';
import { ADMIN_MANAGEMENT_SELECT, requireSuperAdminFromRequest, sanitizeSearch } from '@/lib/admin-management';

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdminFromRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '20'), 1), 100);
    const search = sanitizeSearch(searchParams.get('search') || '');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = auth.value.supabaseAdmin
      .from('Admins')
      .select(ADMIN_MANAGEMENT_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data: data || [], count: count || 0 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}