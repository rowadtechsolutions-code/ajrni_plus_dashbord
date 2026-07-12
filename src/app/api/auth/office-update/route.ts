import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'Office ID is required' }, { status: 400 });
    }

    if (id !== user.id) {
      return NextResponse.json({ error: 'You can only update your own office' }, { status: 403 });
    }

    const ALLOWED = new Set(['office_name', 'email', 'phone_number', 'country', 'city', 'bio', 'image', 'cover', 'commercial_registration_number']);
    const updateData: Record<string, unknown> = {};

    for (const key of Object.keys(rest)) {
      if (!ALLOWED.has(key)) continue;
      let value = rest[key];
      if (typeof value === 'string') value = value.trim();
      if (value === '') value = null;
      updateData[key] = value;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No allowed fields provided' }, { status: 400 });
    }

    const { data: updatedOffice, error: updateError } = await supabase
      .from('Offices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Update failed' },
        { status: 400 },
      );
    }

    return NextResponse.json({ office: updatedOffice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
