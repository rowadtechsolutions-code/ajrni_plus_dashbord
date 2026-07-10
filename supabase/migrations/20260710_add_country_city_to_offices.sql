-- =============================================
-- Migration: إضافة أعمدة country_id و city_id إلى
-- جدول Offices لربطه بجداول countries و cities
-- =============================================

-- 1. إضافة الأعمدة الجديدة
ALTER TABLE "Offices"
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- 2. إنشاء فهارس للسرعة
CREATE INDEX IF NOT EXISTS idx_offices_country_id ON "Offices"(country_id);
CREATE INDEX IF NOT EXISTS idx_offices_city_id ON "Offices"(city_id);

-- 3. ملاحظة: الحقول القديمة country و city ما زالت موجودة
--    للتوافق العكسي مع التطبيقات الحالية
