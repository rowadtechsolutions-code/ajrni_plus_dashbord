-- =============================================
-- سياسات RLS للادمن — صلاحية كاملة على كل الجداول
-- ملاحظة: ما يمسح أي سياسة موجودة من قبل
-- =============================================

-- أولاً: تأكد إن JWT تبع الادمن فيه role داخل app_metadata
-- شغّل هذا وانت مسجل:
-- SELECT auth.jwt() -> 'app_metadata';

-- إذا ما ظهر role: admin، حدث بيانات الأدمنز:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id IN (SELECT id FROM "Admins");

-- =============================================
-- Users
-- =============================================
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_all" ON "Users"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- Offices
-- =============================================
ALTER TABLE "Offices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_offices_all" ON "Offices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- cars
-- =============================================
ALTER TABLE "cars" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_cars_all" ON "cars"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- Favorites
-- =============================================
ALTER TABLE "Favorites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_favorites_all" ON "Favorites"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- BookingRequests
-- =============================================
ALTER TABLE "BookingRequests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_requests_all" ON "BookingRequests"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- BookingRequestOffices (العلاقة بين الطلب والمكاتب)
-- =============================================
ALTER TABLE "BookingRequestOffices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_request_offices_all" ON "BookingRequestOffices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- =============================================
-- BookingOffers
-- =============================================
ALTER TABLE "BookingOffers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_offers_all" ON "BookingOffers"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
