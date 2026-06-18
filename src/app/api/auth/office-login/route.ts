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

    const userMeta = data.user?.user_metadata || {};
    const appMeta = data.user?.app_metadata || {};
    const role = userMeta.role || appMeta.role || '';

    if (role !== 'OFFICE') {
      // إذا مو مسجل كـ Office → تحقق من جدول Offices
      const { data: found } = await supabase
        .from('Offices')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (!found) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: 'This account is not an office' }, { status: 403 });
      }
    }

    const { data: office, error: officeError } = await supabase
      .from('Offices')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (officeError || !office) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    return NextResponse.json({
      office,
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
