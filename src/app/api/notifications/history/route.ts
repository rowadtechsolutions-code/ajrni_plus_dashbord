import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdmin } from '@/lib/admin-scope';

export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  reference_id: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient_name?: string;
  recipient_kind?: 'user' | 'office';
}

interface RecipientRow {
  id: string;
  full_name?: string | null;
  office_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

const sanitizeSearch = (search?: string | null) => {
  return search?.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ') || '';
};

const recipientName = (row: RecipientRow) => {
  return row.full_name || row.office_name || row.email || row.phone_number || row.id.slice(0, 8);
};

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const missingEnv = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean);

  if (missingEnv.length) {
    return NextResponse.json({ error: `Missing env: ${missingEnv.join(', ')}` }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from('Admins')
    .select('id,is_active,role')
    .eq('id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError) {
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  if (!admin || !isSuperAdmin(admin.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get('page') || '1'), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('limit') || '10'), 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const type = searchParams.get('type') || '';
  const readStatus = searchParams.get('readStatus') || '';
  const search = sanitizeSearch(searchParams.get('search'));

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (type) query = query.eq('type', type);
  if (readStatus === 'read') query = query.eq('is_read', true);
  if (readStatus === 'unread') query = query.eq('is_read', false);
  if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as NotificationRow[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const userNames = new Map<string, string>();
  const officeNames = new Map<string, string>();

  if (userIds.length) {
    const [users, offices] = await Promise.all([
      supabaseAdmin.from('Users').select('id,full_name,email,phone_number').in('id', userIds),
      supabaseAdmin.from('Offices').select('id,office_name,email,phone_number').in('id', userIds),
    ]);

    if (!users.error) {
      for (const user of (users.data || []) as RecipientRow[]) {
        userNames.set(user.id, recipientName(user));
      }
    }

    if (!offices.error) {
      for (const office of (offices.data || []) as RecipientRow[]) {
        officeNames.set(office.id, recipientName(office));
      }
    }
  }

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      recipient_name: userNames.get(row.user_id) || officeNames.get(row.user_id) || row.user_id.slice(0, 8),
      recipient_kind: userNames.has(row.user_id) ? 'user' : officeNames.has(row.user_id) ? 'office' : undefined,
    })),
    count: count || 0,
  });
}
