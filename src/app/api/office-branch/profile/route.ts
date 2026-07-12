import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';

const BRANCH_FIELDS = new Set([
  'branch_name',
  'phone_number',
  'country',
  'city',
]);

const OFFICE_ONLY_FIELDS = new Set(['bio', 'image', 'cover']);

const SANITIZE_FIELDS: Record<string, (v: unknown) => unknown> = {
  branch_name: (v) => (typeof v === 'string' ? v.trim() : v),
  phone_number: (v) => (typeof v === 'string' ? v.trim() : v),
  country: (v) => (typeof v === 'string' ? v.trim() : v),
  city: (v) => (typeof v === 'string' ? v.trim() : v),
  bio: (v) => (typeof v === 'string' ? v.trim() : v),
};

export async function PATCH(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: branch } = await supabase
      .from('OfficeBranches')
      .select('id,auth_user_id,linked_office_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const branchUpdate: Record<string, unknown> = {};
    const officeUpdate: Record<string, unknown> = {};

    for (const key of Object.keys(body)) {
      const sanitizer = SANITIZE_FIELDS[key];
      const value = sanitizer ? sanitizer(body[key]) : body[key];

      if (BRANCH_FIELDS.has(key)) {
        branchUpdate[key] = value;
        const officeKey = key === 'branch_name' ? 'office_name' : key;
        officeUpdate[officeKey] = value;
      } else if (OFFICE_ONLY_FIELDS.has(key)) {
        officeUpdate[key] = value;
      }
    }

    if (Object.keys(branchUpdate).length === 0 && Object.keys(officeUpdate).length === 0) {
      return NextResponse.json({ error: 'No allowed fields provided' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // ---- Update OfficeBranches (only BRANCH_FIELDS) ----
    if (Object.keys(branchUpdate).length > 0) {
      const { data: updatedBranch, error: branchUpdateError } = await adminClient
        .from('OfficeBranches')
        .update(branchUpdate)
        .eq('id', branch.id)
        .select()
        .single();

      if (branchUpdateError) {
        return NextResponse.json(
          { error: 'Update failed', message: branchUpdateError.message },
          { status: 400 },
        );
      }

      // ---- Update linked Offices with branch fields ----
      if (branch.linked_office_id) {
        const { error: officeUpdateError } = await adminClient
          .from('Offices')
          .update(officeUpdate)
          .eq('id', branch.linked_office_id);

        if (officeUpdateError) {
          await adminClient
            .from('OfficeBranches')
            .update(branchUpdate)
            .eq('id', branch.id);

          return NextResponse.json(
            { error: 'Sync failed', message: 'تم حفظ بيانات الفرع ولكن فشلت مزامنة بيانات المكتب.', rolledBack: true },
            { status: 400 },
          );
        }
      }
    }

    // ---- Update linked Offices with OFFICE_ONLY_FIELDS (bio/image/cover) ----
    if (Object.keys(officeUpdate).length > 0 && branch.linked_office_id) {
      const { error: officeOnlyError } = await adminClient
        .from('Offices')
        .update(officeUpdate)
        .eq('id', branch.linked_office_id);

      if (officeOnlyError) {
        return NextResponse.json(
          { error: 'Office update failed', message: officeOnlyError.message },
          { status: 400 },
        );
      }
    }

    const { data: updatedBranch } = await adminClient
      .from('OfficeBranches')
      .select(`id,created_at,parent_office_id,branch_name,email,phone_number,country,city,auth_user_id,linked_office_id,is_active`)
      .eq('id', branch.id)
      .single();

    return NextResponse.json({ branch: updatedBranch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
