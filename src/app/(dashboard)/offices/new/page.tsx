'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { useToast } from '@/hooks/useToast';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { countriesService } from '@/services/countries.service';
import { citiesService } from '@/services/cities.service';
import { getCurrentAdminScope } from '@/services/admin-scope.service';
import { isCityLockedByAdminScope, isCountryLockedByAdminScope } from '@/lib/admin-scope';
import { getAuthToken } from '@/lib/supabase/client';
import { FiArrowLeft } from 'react-icons/fi';

export default function NewOfficePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    office_name: '', email: '', password: '', phone_number: '',
    country: '', country_id: '', city: '', city_id: '',
    bio: '', image: '', cover: '', commercial_registration_number: '', is_active: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: adminScope } = useQuery({
    queryKey: ['admin-write-scope'],
    queryFn: getCurrentAdminScope,
    staleTime: 60000,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['countries-active'],
    queryFn: () => countriesService.getAllActive(),
    staleTime: 60000,
  });

  const scopeCountry = adminScope && isCountryLockedByAdminScope(adminScope)
    ? countries.find((c) => c.id === adminScope.country_id || c.code === adminScope.countryCode)
    : null;
  const lockedCountryId = scopeCountry?.id || '';
  const effectiveCountryId = lockedCountryId || form.country_id;

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities-by-country', effectiveCountryId],
    queryFn: () => effectiveCountryId ? citiesService.getByCountry(effectiveCountryId) : Promise.resolve([]),
    enabled: !!effectiveCountryId,
  });

  const scopeCity = adminScope && isCityLockedByAdminScope(adminScope)
    ? cities.find((ct) => ct.id === adminScope.city_id || ct.name_ar === adminScope.cityValue || ct.name_en === adminScope.cityValue)
    : null;
  const lockedCityId = scopeCity?.id || '';
  const effectiveCityId = lockedCityId || form.city_id;
  const countryOptions = lockedCountryId ? countries.filter((c) => c.id === lockedCountryId) : countries;
  const cityOptions = lockedCityId ? cities.filter((ct) => ct.id === lockedCityId) : cities;

  const REQUIRED = ['office_name', 'email', 'password', 'phone_number', 'country_id', 'city_id'];

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const key of REQUIRED) {
      const val = key === 'country_id' ? effectiveCountryId : key === 'city_id' ? effectiveCityId : form[key as keyof typeof form];
      if (!val?.toString().trim()) {
        errs[key.replace('_id', '')] = 'هذا الحقل مطلوب';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) setShowConfirm(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedCountry = countries.find((c) => c.id === effectiveCountryId);
      const selectedCity = cities.find((c) => c.id === effectiveCityId);
      const payload = {
        ...form,
        country_id: effectiveCountryId,
        city_id: effectiveCityId,
        country: selectedCountry?.code || adminScope?.countryCode || form.country,
        city: selectedCity?.name_ar || adminScope?.cityValue || form.city,
      };
      const res = await fetch('/api/create-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create office');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast(t.offices.addOffice + ' ' + t.common.success, 'success');
      router.push('/offices');
    },
    onError: (err: Error) => showToast(err.message || t.common.error, 'error'),
  });

  const handleChange = (key: string, value: string | boolean) => {
    if (key === 'country_id' && lockedCountryId) return;
    if (key === 'city_id' && lockedCityId) return;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key.replace('_id', '')]) setErrors((prev) => ({ ...prev, [key.replace('_id', '')]: '' }));
    if (key === 'country_id') setForm((prev) => ({ ...prev, country_id: value as string, city_id: '', city: '' }));
  };



  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <FiArrowLeft size={18} />
        {t.common.back}
      </button>
      <h1 className="text-2xl font-bold text-white">{t.offices.addOffice}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.officeName} <span className="text-red-400">*</span></label>
            <input type="text" value={form.office_name} onChange={(e) => handleChange('office_name', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.office_name ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.office_name && <p className="mt-1 text-xs text-red-400">{errors.office_name}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.email} <span className="text-red-400">*</span></label>
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">كلمة المرور <span className="text-red-400">*</span></label>
            <input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.password ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.phone} <span className="text-red-400">*</span></label>
            <input type="text" value={form.phone_number} onChange={(e) => handleChange('phone_number', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.phone_number ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.phone_number && <p className="mt-1 text-xs text-red-400">{errors.phone_number}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.country} <span className="text-red-400">*</span></label>
            <select value={effectiveCountryId} onChange={(e) => handleChange('country_id', e.target.value)} disabled={!!lockedCountryId} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.country ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}>
              <option value="">-- اختر الدولة --</option>
              {countryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar} - {c.name_en}</option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.city} <span className="text-red-400">*</span></label>
            <select
              value={effectiveCityId}
              onChange={(e) => handleChange('city_id', e.target.value)}
              disabled={!effectiveCountryId || citiesLoading || !!lockedCityId}
              className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.city ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">{!effectiveCountryId ? '-- اختر الدولة أولاً --' : citiesLoading ? 'جارٍ التحميل...' : cities.length === 0 ? '-- لا توجد مدن --' : '-- اختر المدينة --'}</option>
              {cityOptions.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name_ar} - {ct.name_en}</option>
              ))}
            </select>
            {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.bio}</label>
            <textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div>
            <ImageUpload value={form.image} onChange={(url) => handleChange('image', url)} label={t.offices.image} />
          </div>
          <div>
            <ImageUpload value={form.cover} onChange={(url) => handleChange('cover', url)} label={t.offices.cover} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.commercialReg}</label>
            <input type="text" value={form.commercial_registration_number} onChange={(e) => handleChange('commercial_registration_number', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} className="rounded border-gray-700 bg-gray-800" />
            <label className="text-sm text-gray-400">{t.offices.isActive}</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => router.back()} className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">{t.common.cancel}</button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t.common.save}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => createMutation.mutate()}
        title={t.offices.addOffice}
        message={`هل أنت متأكد من إضافة هذا المكتب؟\n\nالبريد الإلكتروني: ${form.email}\nكلمة المرور: ${form.password}`}
        variant="info"
        loading={createMutation.isPending}
      />
    </div>
  );
}
