-- ================================================================
-- الخطوة 1: شوف الـ policies الموجودة حالياً على جدول Admins
-- ================================================================
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'Admins' AND schemaname = 'public';

-- ================================================================
-- الخطوة 2: احذف كل الـ policies على جدول Admins (بدون استثناء)
-- ================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'Admins' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public."Admins"', pol.policyname);
  END LOOP;
END $$;

-- ================================================================
-- الخطوة 3: احذف الدالة القديمة (إذا موجودة)
-- ================================================================
DROP FUNCTION IF EXISTS public.is_super_admin();

-- ================================================================
-- الخطوة 4: أنشئ policies جديدة بدون recursion
-- ================================================================
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

-- ================================================================
-- الخطوة 5: تأكد من الـ policies الجديدة
-- ================================================================
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'Admins' AND schemaname = 'public';

-- ================================================================
-- الخطوة 6: اختبر الاستعلام
-- ================================================================
SELECT * FROM public."Admins" WHERE id = auth.uid();
