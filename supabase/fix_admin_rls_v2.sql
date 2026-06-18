-- =============================================
-- 1. أول شي تأكد من محتوى JWT تبعك
-- شغّل هذا الاستعلام وأنت مسجل دخول:
-- SELECT auth.jwt();
-- رح يظهرلك الـ claims. تأكد إنه فيه:
-- {
--   "app_metadata": { "role": "admin" },
--   ...
-- }
-- =============================================

-- 2. إذا ما في role بالأبل ميتا، حدث كل الادمنز:
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb 
WHERE id IN (SELECT id FROM "Admins");

-- =============================================
-- 3. البوليسي الجديد — يخلي الادمين يعدل ع كل الجداول
-- بدون ما يمسح أي بوليسي موجود
-- =============================================

CREATE POLICY "Admin full access on Users" ON "Users"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on Offices" ON "Offices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on Cars" ON "Cars"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on Favorites" ON "Favorites"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on BookingRequests" ON "BookingRequests"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on BookingRequestOffices" ON "BookingRequestOffices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin full access on BookingOffers" ON "BookingOffers"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- بديل: إذا لسا المشكلة قائمة، شيل RLS من الجداول كلها
-- شغّل السطرين تحت وريح بالك:
-- =============================================
-- ALTER TABLE "Users" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Offices" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Cars" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Favorites" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "BookingRequests" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "BookingRequestOffices" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "BookingOffers" DISABLE ROW LEVEL SECURITY;
