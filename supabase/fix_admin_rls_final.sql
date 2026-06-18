-- ============================================================
-- الحل النهائي: Fix infinite recursion في RLS
-- ============================================================

-- 1. حذف الدالة اللي تسبب recursion
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 2. حذف الـ policies القديمة
DROP POLICY IF EXISTS "select_admins" ON public."Admins";
DROP POLICY IF EXISTS "insert_admins" ON public."Admins";
DROP POLICY IF EXISTS "update_admins" ON public."Admins";
DROP POLICY IF EXISTS "delete_admins" ON public."Admins";

-- 3. POLICIES الجديدة - بدون recursion
-- تستخدم auth.jwt() بدل ما تسأل نفس الجدول

CREATE POLICY "select_admins" ON public."Admins"
  FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
    OR
    auth.uid() = id
  );

CREATE POLICY "insert_admins" ON public."Admins"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update_admins" ON public."Admins"
  FOR UPDATE
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
    OR
    auth.uid() = id
  )
  WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
    OR
    auth.uid() = id
  );

CREATE POLICY "delete_admins" ON public."Admins"
  FOR DELETE
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

-- 4. تحديث app_metadata للمستخدمين الموجودين في جدول Admins
-- هذا يخلي JWT يحمل role الصحيح
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', (SELECT role FROM public."Admins" WHERE id = auth.users.id))
WHERE id IN (SELECT id FROM public."Admins");

-- 5. تأكد من التحديث
SELECT id, email, raw_app_meta_data->>'role' as admin_role
FROM auth.users
WHERE id IN (SELECT id FROM public."Admins");
