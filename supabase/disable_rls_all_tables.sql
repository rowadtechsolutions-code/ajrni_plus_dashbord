-- Disable RLS on all data tables so the admin can operate freely
-- The auth is handled by the application layer (AuthContext + JWT)

ALTER TABLE "Users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Offices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Cars" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorites" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingRequests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingRequestOffices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingOffers" DISABLE ROW LEVEL SECURITY;

-- Keep RLS on Admins table with proper JWT policy (already set up)
-- Run this if you want to re-enable:
-- ALTER TABLE "Admins" ENABLE ROW LEVEL SECURITY;
