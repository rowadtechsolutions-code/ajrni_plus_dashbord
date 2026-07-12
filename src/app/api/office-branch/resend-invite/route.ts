import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient, extractAdminFromRequest } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const admin = await extractAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { code: 'admin_required', message: 'ليس لديك صلاحية لتنفيذ هذه العملية.' },
        { status: 403 },
      );
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { code: 'missing_id', message: 'Branch ID is required' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: branch } = await supabaseAdmin
      .from('OfficeBranches')
      .select('id,auth_user_id,email,branch_name,parent_office_id')
      .eq('id', id)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json(
        { code: 'branch_not_found', message: 'الفرع غير موجود.' },
        { status: 404 },
      );
    }

    if (!branch.auth_user_id || !branch.email) {
      return NextResponse.json(
        { code: 'missing_auth_data', message: 'الفرع لا يملك بيانات تسجيل دخول صالحة.' },
        { status: 400 },
      );
    }

    // Verify the auth user still exists
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(branch.auth_user_id);
    if (!authUser?.user) {
      return NextResponse.json(
        { code: 'auth_user_not_found', message: 'حساب الدخول المرتبط بهذا الفرع لم يعد موجودًا. أعد إنشاء الفرع.' },
        { status: 404 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajrniplus.com';
    const redirectTo = `${siteUrl}/auth/update-password`;

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: resetError } = await supabaseAnon.auth.resetPasswordForEmail(
      branch.email,
      { redirectTo },
    );

    if (resetError) {
      console.error('[resend-invite] resetPasswordForEmail failed', {
        authUserId: branch.auth_user_id,
        email: branch.email,
        error: resetError.message,
        status: resetError.status,
      });

      if (resetError.message?.toLowerCase().includes('rate') || resetError.status === 429) {
        return NextResponse.json(
          { code: 'rate_limited', message: 'تم إرسال رابط مؤخرًا. يرجى الانتظار دقيقة قبل طلب رابط جديد.' },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { code: 'reset_failed', message: 'فشل إرسال رابط تعيين كلمة المرور.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { code: 'internal_error', message: err.message || 'Internal error' },
      { status: 500 },
    );
  }
}
