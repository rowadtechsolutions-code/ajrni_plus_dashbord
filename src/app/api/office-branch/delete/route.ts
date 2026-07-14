import { NextResponse } from 'next/server';
import { getAdminClient, extractAdminFromRequest, isOfficeInsideAdminScope } from '@/lib/supabase/admin';

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
      .select('id,auth_user_id,linked_office_id')
      .eq('id', id)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json(
        { code: 'branch_not_found', message: 'الفرع غير موجود.' },
        { status: 404 },
      );
    }

    const insideScope = await isOfficeInsideAdminScope(admin, branch.linked_office_id, supabaseAdmin);
    if (!insideScope) {
      return NextResponse.json(
        { code: 'outside_admin_scope', message: 'Record is outside admin data scope.' },
        { status: 403 },
      );
    }
    const { auth_user_id: authUserId, linked_office_id: linkedOfficeId } = branch;

    // ---- Check for linked operational data ----
    const checkTables: { table: string; label: string }[] = [
      { table: 'Cars', label: 'سيارات' },
    ];

    const linkedData: string[] = [];

    if (linkedOfficeId) {
      for (const { table, label } of checkTables) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('office_id', linkedOfficeId)
          .limit(1);

        if (!error && data && data.length > 0) {
          linkedData.push(label);
        }
      }
    }

    if (linkedData.length > 0) {
      return NextResponse.json(
        {
          code: 'linked_data_exists',
          message: `لا يمكن حذف الفرع لوجود بيانات مرتبطة به (${linkedData.join('، ')}). يمكنك تعطيله بدلًا من ذلك.`,
        },
        { status: 409 },
      );
    }

    // ---- Delete: OfficeBranches → Offices → Auth User ----
    const { error: branchDeleteError } = await supabaseAdmin
      .from('OfficeBranches')
      .delete()
      .eq('id', id);

    if (branchDeleteError) {
      return NextResponse.json(
        { code: 'branch_delete_failed', message: 'فشل حذف سجل الفرع.' },
        { status: 400 },
      );
    }

    if (linkedOfficeId) {
      const { error: officeDeleteError } = await supabaseAdmin
        .from('Offices')
        .delete()
        .eq('id', linkedOfficeId);

      if (officeDeleteError) {
        return NextResponse.json(
          { code: 'office_delete_failed', message: 'تم حذف الفرع ولكن فشل حذف سجل المكتب المرتبط.' },
          { status: 400 },
        );
      }
    }

    if (authUserId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId, false);

      if (authDeleteError) {
        return NextResponse.json({
          success: true,
          warning: 'تم حذف السجلات ولكن فشل حذف حساب المستخدم.',
          authUserId,
          authDeleteError: authDeleteError.message,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { code: 'internal_error', message: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
