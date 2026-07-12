import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
    }

    const userId = data.user?.id;

    // ---- 1. Check Admins ----
    const { data: adminData } = await supabase
      .from('Admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (adminData) {
      return NextResponse.json({
        accountType: 'admin',
        session: { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token },
      });
    }

    // ---- 2. Check OfficeBranches (before Offices, because branches also have Office records) ----
    const { data: branch, error: branchError } = await supabase
      .from('OfficeBranches')
      .select(`
        id,
        created_at,
        parent_office_id,
        branch_name,
        email,
        phone_number,
        country,
        city,
        auth_user_id,
        linked_office_id,
        is_active
      `)
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!branchError && branch) {
      const { data: linkedOffice } = await supabase
        .from('Offices')
        .select('*')
        .eq('id', branch.linked_office_id)
        .maybeSingle();

      return NextResponse.json({
        accountType: 'branch',
        branch: {
          branchId: branch.id,
          parentOfficeId: branch.parent_office_id,
          linkedOfficeId: branch.linked_office_id,
          authUserId: branch.auth_user_id,
          branchName: branch.branch_name,
          email: branch.email,
          phone_number: branch.phone_number,
          country: branch.country,
          city: branch.city,
          is_active: branch.is_active,
          bio: linkedOffice?.bio || null,
          image: linkedOffice?.image || null,
          cover: linkedOffice?.cover || null,
        },
        office: linkedOffice || null,
        session: { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token },
      });
    }

    // ---- 3. Check Offices ----
    const { data: office, error: officeError } = await supabase
      .from('Offices')
      .select('*')
      .eq('id', userId)
      .single();

    if (!officeError && office) {
      return NextResponse.json({
        accountType: 'office',
        office,
        session: { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token },
      });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Account not found. Please check your credentials.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
