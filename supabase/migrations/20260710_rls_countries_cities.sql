-- =============================================
-- RLS Policies for countries and cities tables
-- =============================================

-- =============================================
-- countries
-- =============================================
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- المشرفون فقط لديهم صلاحية كاملة (إضافة، تعديل، حذف، عرض)
CREATE POLICY "admin_countries_all" ON public.countries
  FOR ALL USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- المستخدمون العاديون يمكنهم فقط قراءة الدول النشطة
CREATE POLICY "users_countries_read" ON public.countries
  FOR SELECT USING (
    is_active = true
  );

-- =============================================
-- cities
-- =============================================
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- المشرفون فقط لديهم صلاحية كاملة
CREATE POLICY "admin_cities_all" ON public.cities
  FOR ALL USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- المستخدمون العاديون يمكنهم فقط قراءة المدن النشطة
CREATE POLICY "users_cities_read" ON public.cities
  FOR SELECT USING (
    is_active = true
  );
