-- احذف الـ policies القديمة اللي تسوي subquery على نفس الجدول (تسبب recursion)
DROP POLICY IF EXISTS "Admins can view own or super admin can view all" ON public."Admins";
DROP POLICY IF EXISTS "Admins can update own or super admin can update all" ON public."Admins";
DROP POLICY IF EXISTS "Only super admin can create admins" ON public."Admins";
DROP POLICY IF EXISTS "Only super admin can delete" ON public."Admins";
DROP POLICY IF EXISTS "Only super admin can delete admins" ON public."Admins";
DROP POLICY IF EXISTS "Admins can update own profile" ON public."Admins";
DROP POLICY IF EXISTS "Admins can view own profile" ON public."Admins";

-- تأكد: المفروض يبقى فقط الـ 4 policies الجديدة
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'Admins' AND schemaname = 'public';
