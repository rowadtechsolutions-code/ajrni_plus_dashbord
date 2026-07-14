import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient, extractAdminFromRequest, isOfficeInsideAdminScope, validateWriteScope } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function logSupabaseError(label: string, error: SupabaseErrorLike | null) {
  console.error(label, {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}
export async function POST(req: Request) {
  try {
    const admin = await extractAdminFromRequest(req);
    if (!admin) {
      console.error('[create-office-branch] Admin verification failed');
      return NextResponse.json(
        { code: 'admin_required', message: 'ليس لديك صلاحية لتنفيذ هذه العملية.' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      parent_office_id,
      branch_name,
      phone_number,
      country,
      city,
      bio,
      image,
      cover,
      login_email,
    } = body;

    if (!parent_office_id || !branch_name || !login_email) {
      return NextResponse.json(
        { code: 'missing_fields', message: 'parent_office_id, branch_name, and login_email are required' },
        { status: 400 },
      );
    }

    const trimmedName = branch_name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json(
        { code: 'invalid_branch_name', message: 'Branch name must be between 2 and 100 characters' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    // ---- 1. Fetch parent office ----
    console.error('[create-office-branch] step 1: fetch parent office', { parent_office_id });
    const { data: parentOffice } = await supabaseAdmin
      .from('Offices')
      .select('id,office_name,email,country,city')
      .eq('id', parent_office_id)
      .maybeSingle();

    if (!parentOffice) {
      console.error('[create-office-branch] step 1 FAIL: parent office not found', { parent_office_id });
      return NextResponse.json(
        { code: 'parent_office_not_found', message: 'المكتب الرئيسي غير موجود.' },
        { status: 404 },
      );
    }

    const parentInsideScope = await isOfficeInsideAdminScope(admin, parent_office_id, supabaseAdmin);
    const branchInsideScope = await validateWriteScope(admin, { country: country || null, city: city || null }, supabaseAdmin);
    if (!parentInsideScope || !branchInsideScope) {
      return NextResponse.json(
        { code: 'outside_admin_scope', message: 'Record is outside admin data scope.' },
        { status: 403 },
      );
    }
    // ---- 2. Normalize login email ----
    const normalizedLoginEmail = login_email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedLoginEmail)) {
      console.error('[create-office-branch] step 2 FAIL: invalid email', { normalizedLoginEmail });
      return NextResponse.json(
        { code: 'invalid_login_email', message: 'بريد تسجيل الدخول غير صالح.' },
        { status: 400 },
      );
    }

    // ---- 3. Check login_email != parent office email ----
    if (parentOffice.email && parentOffice.email.toLowerCase() === normalizedLoginEmail) {
      return NextResponse.json(
        { code: 'branch_email_same_as_parent', message: 'يجب استخدام بريد دخول مختلف عن بريد المكتب الرئيسي.' },
        { status: 409 },
      );
    }

    // ---- 4. Check login_email not in Offices ----
    const { data: officesWithEmail } = await supabaseAdmin
      .from('Offices')
      .select('id')
      .ilike('email', normalizedLoginEmail)
      .maybeSingle();
    if (officesWithEmail) {
      return NextResponse.json(
        { code: 'branch_login_email_exists', message: 'بريد تسجيل الدخول مستخدم بالفعل. استخدم بريدًا جديدًا للفرع.' },
        { status: 409 },
      );
    }

    // ---- 5. Check login_email not in OfficeBranches ----
    const { data: branchesWithEmail } = await supabaseAdmin
      .from('OfficeBranches')
      .select('id')
      .ilike('email', normalizedLoginEmail)
      .maybeSingle();
    if (branchesWithEmail) {
      return NextResponse.json(
        { code: 'branch_login_email_exists', message: 'بريد تسجيل الدخول مستخدم بالفعل. استخدم بريدًا جديدًا للفرع.' },
        { status: 409 },
      );
    }

    // ---- 6. Check login_email not in Admins ----
    const { data: adminsWithEmail } = await supabaseAdmin
      .from('Admins')
      .select('id')
      .ilike('email', normalizedLoginEmail)
      .maybeSingle();
    if (adminsWithEmail) {
      return NextResponse.json(
        { code: 'branch_login_email_exists', message: 'بريد تسجيل الدخول مستخدم بالفعل. استخدم بريدًا جديدًا للفرع.' },
        { status: 409 },
      );
    }

    // ---- 7. Check login_email not in Auth users (fetch all pages) ----
    console.error('[create-office-branch] step 7: check auth users', { normalizedLoginEmail });
    let authEmailExists = false;
    let page = 1;
    const perPage = 1000;
    let totalFetched = 0;

    try {
      while (true) {
        const { data: pageData, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (pageError) {
          console.error('[create-office-branch] step 7 listUsers page error', { page, error: pageError });
          break;
        }
        const users = pageData?.users || [];
        totalFetched += users.length;
        const found = users.some((u) => u.email?.toLowerCase() === normalizedLoginEmail);
        if (found) {
          authEmailExists = true;
          break;
        }
        if (users.length < perPage) break;
        page++;
      }
    } catch (pageErr) {
      console.error('[create-office-branch] step 7 listUsers exception', pageErr);
    }

    console.error('[create-office-branch] step 7 result', { authEmailExists, totalFetched, pages: page });

    if (authEmailExists) {
      return NextResponse.json(
        { code: 'branch_login_email_exists', message: 'بريد تسجيل الدخول مستخدم بالفعل. استخدم بريدًا جديدًا للفرع.' },
        { status: 409 },
      );
    }

    // ---- 8. Check duplicate branch name under same parent ----
    const { data: existingBranch } = await supabaseAdmin
      .from('OfficeBranches')
      .select('id')
      .eq('parent_office_id', parent_office_id)
      .ilike('branch_name', trimmedName)
      .maybeSingle();
    if (existingBranch) {
      return NextResponse.json(
        { code: 'branch_name_duplicate', message: 'يوجد فرع بنفس الاسم مرتبط بهذا المكتب.' },
        { status: 409 },
      );
    }

    // ---- 9. Create Auth User silently (no email sent yet) ----
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajrniplus.com';
    const redirectTo = `${siteUrl}/auth/update-password`;

    console.error('[create-office-branch] step 9: create auth user silently', {
      email: normalizedLoginEmail,
      user_metadata: { role: 'BRANCH', branch_name: trimmedName, parent_office_id },
    });

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedLoginEmail,
      email_confirm: true,
      user_metadata: {
        role: 'BRANCH',
        branch_name: trimmedName,
        parent_office_id,
      },
    });

    if (createUserError || !createdUser?.user) {
      const errMsg = createUserError?.message || 'No user returned';
      console.error('[create-office-branch] step 9 FAILED', { error: errMsg });
      const errLower = errMsg.toLowerCase();
      if (errLower.includes('already exists') || errLower.includes('already registered') || errLower.includes('user already')) {
        return NextResponse.json(
          { code: 'branch_login_email_exists', message: 'هذا البريد مستخدم بالفعل. استخدم بريدًا جديدًا للفرع.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { code: 'auth_user_creation_failed', message: 'فشل إنشاء حساب الفرع. يرجى المحاولة مرة أخرى.', debug: errMsg },
        { status: 400 },
      );
    }

    const authUserId = createdUser.user.id;
    const normalizedEmail = normalizedLoginEmail;

    // ---- 10. Create Offices row ----
    console.error('[create-office-branch] step 10: insert Offices', {
      id: authUserId,
      office_name: trimmedName,
      email: normalizedEmail,
      country,
      city,
    });

    const linkedOfficePayload = {
      id: authUserId,
      office_name: trimmedName,
      email: normalizedEmail,
      phone_number: phone_number?.trim() || null,
      country: country || null,
      city: city || null,
      is_active: false,
      bio: bio?.trim() || null,
      image: image || null,
      cover: cover || null,
      commercial_registration_number: null,
    };

    const { data: officeRecord, error: officeInsertError } = await supabaseAdmin
      .from('Offices')
      .insert(linkedOfficePayload)
      .select()
      .single();

    if (officeInsertError || !officeRecord) {
      logSupabaseError('[create-office-branch] step 10 Supabase error', officeInsertError);
      console.error('[create-office-branch] step 10 FAILED', {
        error: officeInsertError ? JSON.stringify(officeInsertError) : 'No record returned',
        payload: JSON.stringify(linkedOfficePayload),
      });
      await supabaseAdmin.auth.admin.deleteUser(authUserId, false);
      return NextResponse.json(
        { code: 'offices_insert_failed', message: 'فشل إنشاء سجل الفرع.', rolledBack: true },
        { status: 400 },
      );
    }

    console.error('[create-office-branch] step 10 OK', { officeId: officeRecord.id });

    // ---- 11. Create OfficeBranches row ----
    console.error('[create-office-branch] step 11: insert OfficeBranches', {
      parent_office_id,
      auth_user_id: authUserId,
      linked_office_id: authUserId,
      branch_name: trimmedName,
      email: normalizedEmail,
    });

    const branchPayload = {
      parent_office_id,
      auth_user_id: authUserId,
      linked_office_id: authUserId,
      branch_name: trimmedName,
      email: normalizedEmail,
      phone_number: phone_number?.trim() || null,
      country: country || null,
      city: city || null,
      is_active: false,
    };

    const { data: branchRecord, error: branchInsertError } = await supabaseAdmin
      .from('OfficeBranches')
      .insert(branchPayload)
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
      .single();

    if (branchInsertError || !branchRecord) {
      logSupabaseError('[create-office-branch] step 11 Supabase error', branchInsertError);
      console.error('[create-office-branch] step 11 FAILED', {
        error: branchInsertError ? JSON.stringify(branchInsertError) : 'No record returned',
        payload: JSON.stringify(branchPayload),
      });
      await supabaseAdmin.from('Offices').delete().eq('id', authUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUserId, false);
      return NextResponse.json(
        { code: 'branch_insert_failed', message: 'فشل إنشاء سجل الفرع.', rolledBack: true },
        { status: 400 },
      );
    }

    console.error('[create-office-branch] step 11 OK', { branchId: branchRecord.id });

    // ---- 12. All records created successfully — now send recovery email ----
    console.error('[create-office-branch] step 12: send recovery email', { email: normalizedEmail, redirectTo });

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: recoveryError } = await supabaseAnon.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo },
    );

    if (recoveryError) {
      console.error('[create-office-branch] step 12 recovery email failed', {
        error: recoveryError.message,
        authUserId,
      });
    }

    return NextResponse.json({
      success: true,
      branch: branchRecord,
      office: officeRecord,
      authUserId,
    });
  } catch (err: any) {
    console.error('[create-office-branch] UNCAUGHT EXCEPTION', {
      message: err.message,
      stack: err.stack,
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return NextResponse.json(
      { code: 'internal_error', message: err.message || 'Internal error' },
      { status: 500 },
    );
  }
}
