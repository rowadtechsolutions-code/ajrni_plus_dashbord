import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, image, cover, bio, commercial_registration_number, is_active, id, country_id, city_id, ...officeMeta } = body;

    if (!officeMeta.email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfigured: missing SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. تحقق إذا المستخدم موجود مسبقاً
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === officeMeta.email);
    let authUser;

    if (existingUser) {
      authUser = existingUser;
    } else {
      const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: officeMeta.email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'OFFICE',
          name: officeMeta.office_name,
          phone: officeMeta.phone_number,
          country: officeMeta.country,
          city: officeMeta.city,
          country_id: country_id || null,
          city_id: city_id || null,
        },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      authUser = data.user;
    }

    const officeId = authUser.id;

    // 2. تحقق إذا الـ Office مسجل بالجدول
    const { data: existingOffice } = await supabaseAdmin
      .from('Offices')
      .select('id')
      .eq('id', officeId)
      .maybeSingle();

    // 3. نقل الصور من temp لمجلد المكتب
    const moveFile = async (url: string | undefined): Promise<string | undefined> => {
      if (!url) return undefined;
      const storageUrl = `${supabaseUrl}/storage/v1/object/public/Offices/`;
      if (!url.startsWith(storageUrl)) return url;

      const oldPath = url.replace(storageUrl, '');
      const fileName = oldPath.split('/').pop();
      if (!fileName) return url;

      const newPath = `offices/${officeId}/${fileName}`;

      const { error: moveErr } = await supabaseAdmin.storage
        .from('Offices')
        .move(oldPath, newPath);

      if (moveErr) return url;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('Offices')
        .getPublicUrl(newPath);

      return publicUrl;
    };

    const finalImage = await moveFile(image);
    const finalCover = await moveFile(cover);

    let office;

    if (!existingOffice) {
      // 4a. إذا ما في سجل — أنشئه يدوياً (الـ trigger يمكن ما اشتغل)
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('Offices')
        .insert([{
          id: officeId,
          office_name: officeMeta.office_name,
          email: officeMeta.email,
          phone_number: officeMeta.phone_number,
          country: officeMeta.country,
          city: officeMeta.city,
          is_active: is_active ?? false,
          image: finalImage || null,
          cover: finalCover || null,
          bio: bio || null,
          commercial_registration_number: commercial_registration_number || null,
        }])
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message, details: insertErr }, { status: 400 });
      }
      office = inserted;
    } else {
      // 4b. إذا في سجل — حدّثه
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('Offices')
        .update({
          image: finalImage || null,
          cover: finalCover || null,
          bio: bio || null,
          commercial_registration_number: commercial_registration_number || null,
          is_active: is_active ?? false,
        })
        .eq('id', officeId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message, details: updateErr }, { status: 400 });
      }
      office = updated;
    }

    return NextResponse.json({ office, user: { id: officeId, email: authUser.email } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
