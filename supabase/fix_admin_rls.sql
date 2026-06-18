-- ============================================================
-- الحل النهائي: إزالة الـ infinite recursion في RLS
-- المشكلة: is_super_admin() تسأل جدول Admins → نفس الجدول اللي عليه RLS → recursion
-- الحل: نخزّن role في auth.users.app_metadata ونسأل JWT مباشرة
-- ============================================================

-- 1. حذف الدالة اللي تسبب recursion
DROP FUNCTION IF EXISTS public.is_super_admin();

-- 2. حذف كل الـ policies القديمة
DROP POLICY IF EXISTS "select_admins" ON public."Admins";
DROP POLICY IF EXISTS "insert_admins" ON public."Admins";
DROP POLICY IF EXISTS "update_admins" ON public."Admins";
DROP POLICY IF EXISTS "delete_admins" ON public."Admins";

-- 3. POLICIES الجديدة - بدون recursion
-- 3.1 SELECT: 
--     - app_metadata.role = 'super_admin' → يشوف الكل
--     - auth.uid() = id → يشوف نفسه فقط
CREATE POLICY "select_admins" ON public."Admins"
  FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
    OR
    auth.uid() = id
  );

-- 3.2 INSERT: المستخدم يسجل نفسه
CREATE POLICY "insert_admins" ON public."Admins"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3.3 UPDATE:
--     - super_admin يعدّل الكل
--     - admin يعدّل نفسه
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

-- 3.4 DELETE: فقط super_admin
CREATE POLICY "delete_admins" ON public."Admins"
  FOR DELETE
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

-- 4. تحديث app_metadata للمستخدمين الموجودين في جدول Admins
-- هذا يضيف role لكل مستخدم في auth.users حسب قيمته في Admins
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', (SELECT role FROM public."Admins" WHERE id = auth.users.id))
WHERE id IN (SELECT id FROM public."Admins");

-- 5. تأكد من التحديث
SELECT id, email, raw_app_meta_data->>'role' as admin_role
FROM auth.users
WHERE id IN (SELECT id FROM public."Admins");
