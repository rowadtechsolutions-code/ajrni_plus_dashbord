-- ============================================================
-- حل مشكلة عدم تطابق UUID بين Auth users وجدول Admins
-- ============================================================

-- 1. اعرف UUID الصحيح من auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'ajrniplus.admin@gmail.com';

-- 2. حدّث سجل Admins لاستخدام UUID الصحيح
UPDATE public."Admins"
SET id = (
  SELECT id FROM auth.users WHERE email = 'ajrniplus.admin@gmail.com'
)
WHERE email = 'ajrniplus.admin@gmail.com';

-- 3. تأكد من التحديث
SELECT * FROM public."Admins" WHERE email = 'ajrniplus.admin@gmail.com';

-- ============================================================
-- إذا ما في مستخدم أصلاً في auth.users:
-- ============================================================
-- 1. أنشئ المستخدم من Supabase Dashboard:
--    Authentication → Add User → ajrniplus.admin@gmail.com
-- 2. بعدها شغّل الأمر 1 و 2 أعلاه
