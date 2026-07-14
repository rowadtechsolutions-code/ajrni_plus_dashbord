import { NextResponse } from 'next/server';
import { getAdminClient, extractAdminFromRequest, isOfficeInsideAdminScope, validateWriteScope } from '@/lib/supabase/admin';

const SYNCED_BRANCH_FIELDS: Array<{
  branchKey: string;
  officeKey: string;
  sanitize?: (v: unknown) => unknown;
}> = [
  { branchKey: 'branch_name', officeKey: 'office_name', sanitize: (v) => (typeof v === 'string' ? v.trim() : v) },
  { branchKey: 'email', officeKey: 'email', sanitize: (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v) },
  { branchKey: 'phone_number', officeKey: 'phone_number', sanitize: (v) => (typeof v === 'string' ? v.trim() : v) },
  { branchKey: 'country', officeKey: 'country' },
  { branchKey: 'city', officeKey: 'city' },
  { branchKey: 'is_active', officeKey: 'is_active' },
];

// bio, image, cover are stored in Offices only (columns deleted from OfficeBranches)
const OFFICE_ONLY_FIELDS = new Set(['bio', 'image', 'cover']);

const PROTECTED_FIELDS = new Set([
  'id', 'auth_user_id', 'linked_office_id', 'parent_office_id', 'created_at',
  'commercial_registration_number',
]);

export async function PATCH(req: Request) {
  try {
    const admin = await extractAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { code: 'admin_required', message: 'ليس لديك صلاحية لتنفيذ هذه العملية.' },
        { status: 403 },
      );
    }

    const { id, ...body } = await req.json();
    if (!id) {
      return NextResponse.json(
        { code: 'missing_id', message: 'Branch ID is required' },
        { status: 400 },
      );
    }

    const protectedKeys = Object.keys(body).filter((k) => PROTECTED_FIELDS.has(k));
    if (protectedKeys.length > 0) {
      return NextResponse.json(
        { code: 'protected_fields', message: `الحقول التالية لا يمكن تعديلها: ${protectedKeys.join(', ')}` },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: branch } = await supabaseAdmin
      .from('OfficeBranches')
      .select('id,linked_office_id,auth_user_id,country,city')
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
    const linkedOfficeId = branch.linked_office_id;
    if (!linkedOfficeId) {
      return NextResponse.json(
        { code: 'no_linked_office', message: 'الفرع غير مرتبط بسجل مكتب.' },
        { status: 400 },
      );
    }

    const { data: linkedOffice } = await supabaseAdmin
      .from('Offices')
      .select('id,country,city')
      .eq('id', linkedOfficeId)
      .maybeSingle<{ id: string; country: string | null; city: string | null }>();
    const branchUpdate: Record<string, unknown> = {};
    const officeUpdate: Record<string, unknown> = {};

    for (const mapping of SYNCED_BRANCH_FIELDS) {
      if (body[mapping.branchKey] !== undefined) {
        const value = mapping.sanitize ? mapping.sanitize(body[mapping.branchKey]) : body[mapping.branchKey];
        branchUpdate[mapping.branchKey] = value;
        officeUpdate[mapping.officeKey] = value;
      }
    }

    for (const key of OFFICE_ONLY_FIELDS) {
      if (body[key] !== undefined) {
        const raw = body[key];
        officeUpdate[key] = key === 'bio' && typeof raw === 'string' ? raw.trim() : raw;
      }
    }

    if (Object.keys(branchUpdate).length === 0 && Object.keys(officeUpdate).length === 0) {
      return NextResponse.json(
        { code: 'no_fields', message: 'لم يتم توفير أي حقول للتعديل.' },
        { status: 400 },
      );
    }

    const targetCountry = typeof officeUpdate.country === 'string'
      ? officeUpdate.country
      : linkedOffice?.country ?? branch.country ?? null;
    const targetCity = typeof officeUpdate.city === 'string'
      ? officeUpdate.city
      : linkedOffice?.city ?? branch.city ?? null;
    const targetInsideScope = await validateWriteScope(admin, { country: targetCountry || null, city: targetCity || null }, supabaseAdmin);
    if (!targetInsideScope) {
      return NextResponse.json(
        { code: 'outside_admin_scope', message: 'Record is outside admin data scope.' },
        { status: 403 },
      );
    }
    if (Object.keys(branchUpdate).length > 0) {
      const { error: branchUpdateError } = await supabaseAdmin
        .from('OfficeBranches')
        .update(branchUpdate)
        .eq('id', id);

      if (branchUpdateError) {
        const msg = branchUpdateError.message || 'Unknown error';
        return NextResponse.json(
          { code: 'branch_update_failed', message: `فشل تحديث سجل الفرع: ${msg}`, debug: msg },
          { status: 400 },
        );
      }
    }

    if (Object.keys(officeUpdate).length > 0) {
      const { error: officeUpdateError } = await supabaseAdmin
        .from('Offices')
        .update(officeUpdate)
        .eq('id', linkedOfficeId);

      if (officeUpdateError) {
        if (Object.keys(branchUpdate).length > 0) {
          await supabaseAdmin
            .from('OfficeBranches')
            .update(branchUpdate)
            .eq('id', id);
        }

        const msg = officeUpdateError.message || 'Unknown error';
        return NextResponse.json(
          { code: 'office_sync_failed', message: `فشل مزامنة بيانات الفرع: ${msg}`, rolledBack: true, debug: msg },
          { status: 400 },
        );
      }
    }

    const { data: updatedBranch } = await supabaseAdmin
      .from('OfficeBranches')
      .select(`
        id,created_at,parent_office_id,branch_name,email,phone_number,country,city,auth_user_id,is_active,
        linked_office:Offices!office_branches_linked_office_id_fkey (
          id, office_name, country, city, email, phone_number, bio, image, cover, is_active
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, branch: updatedBranch });
  } catch (err: unknown) {
    return NextResponse.json(
      { code: 'internal_error', message: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
