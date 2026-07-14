import { NextResponse } from 'next/server';
import { getAdminClient, extractAdminFromRequest, isOfficeInsideAdminScope } from '@/lib/supabase/admin';

export async function PATCH(req: Request) {
  try {
    const admin = await extractAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { code: 'admin_required', message: 'ليس لديك صلاحية لتنفيذ هذه العملية.' },
        { status: 403 },
      );
    }

    const { id, is_active } = await req.json();
    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { code: 'invalid_payload', message: 'Branch ID and is_active are required' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: branch } = await supabaseAdmin
      .from('OfficeBranches')
      .select('id,linked_office_id,is_active')
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
    const previousActive = branch.is_active;
    const linkedOfficeId = branch.linked_office_id;

    const { error: branchUpdateError } = await supabaseAdmin
      .from('OfficeBranches')
      .update({ is_active })
      .eq('id', id);

    if (branchUpdateError) {
      return NextResponse.json(
        { code: 'branch_toggle_failed', message: 'فشل تحديث حالة الفرع.' },
        { status: 400 },
      );
    }

    if (linkedOfficeId) {
      const { error: officeUpdateError } = await supabaseAdmin
        .from('Offices')
        .update({ is_active })
        .eq('id', linkedOfficeId);

      if (officeUpdateError) {
        await supabaseAdmin
          .from('OfficeBranches')
          .update({ is_active: previousActive })
          .eq('id', id);

        return NextResponse.json(
          { code: 'office_sync_failed', message: 'فشل مزامنة حالة التفعيل.' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true, is_active });
  } catch (err: unknown) {
    return NextResponse.json(
      { code: 'internal_error', message: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
