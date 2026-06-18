-- إضافة بوليسي للادمين على كل جدول بدون ما يمسح أي بوليسي موجود
-- تستخدم auth.jwt() عشان تتجنب الـ infinite recursion

-- 1. Users
ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on Users" ON "Users"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 2. Offices
ALTER TABLE "Offices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on Offices" ON "Offices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 3. Cars
ALTER TABLE "Cars" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on Cars" ON "Cars"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 4. Favorites
ALTER TABLE "Favorites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on Favorites" ON "Favorites"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 5. BookingRequests
ALTER TABLE "BookingRequests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on BookingRequests" ON "BookingRequests"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 6. BookingRequestOffices
ALTER TABLE "BookingRequestOffices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on BookingRequestOffices" ON "BookingRequestOffices"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 7. BookingOffers
ALTER TABLE "BookingOffers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on BookingOffers" ON "BookingOffers"
  FOR ALL USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
