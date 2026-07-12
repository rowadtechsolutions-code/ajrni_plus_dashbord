-- RLS Policies for OfficeBranches
-- Enable RLS (if not already enabled)
ALTER TABLE public."OfficeBranches" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Admins can read all branches" ON public."OfficeBranches";
DROP POLICY IF EXISTS "Admins can insert branches" ON public."OfficeBranches";
DROP POLICY IF EXISTS "Admins can update branches" ON public."OfficeBranches";
DROP POLICY IF EXISTS "Admins can delete branches" ON public."OfficeBranches";
DROP POLICY IF EXISTS "Branches can read own record" ON public."OfficeBranches";
DROP POLICY IF EXISTS "Branches can update own record" ON public."OfficeBranches";

-- 1. Admin full access (using JWT role check to avoid recursion)
CREATE POLICY "Admins can read all branches" ON public."OfficeBranches"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    auth.uid() IN (SELECT id FROM public."Admins")
  );

CREATE POLICY "Admins can insert branches" ON public."OfficeBranches"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    auth.uid() IN (SELECT id FROM public."Admins")
  );

CREATE POLICY "Admins can update branches" ON public."OfficeBranches"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    auth.uid() IN (SELECT id FROM public."Admins")
  );

CREATE POLICY "Admins can delete branches" ON public."OfficeBranches"
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    auth.uid() IN (SELECT id FROM public."Admins")
  );

-- 2. Branch own-record read access only (auth_user_id = auth.uid())
-- Updates are handled exclusively via the secure PATCH /api/office-branch/profile server route.
CREATE POLICY "Branches can read own record" ON public."OfficeBranches"
  FOR SELECT
  USING (auth_user_id = auth.uid());

COMMENT ON POLICY "Admins can read all branches" ON public."OfficeBranches" IS 'Admin users (by JWT role or Admins table) can read all branches';
COMMENT ON POLICY "Admins can insert branches" ON public."OfficeBranches" IS 'Admin users can create new branches';
COMMENT ON POLICY "Admins can update branches" ON public."OfficeBranches" IS 'Admin users can update any branch';
COMMENT ON POLICY "Admins can delete branches" ON public."OfficeBranches" IS 'Admin users can delete branches';
COMMENT ON POLICY "Branches can read own record" ON public."OfficeBranches" IS 'Branch users can only read their own record via auth_user_id';
