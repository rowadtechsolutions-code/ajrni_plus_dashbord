'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { useToast } from '@/hooks/useToast';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { gulfCountries } from '@/data/gulf';
import { FiArrowLeft } from 'react-icons/fi';

export default function NewOfficePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    office_name: '', email: '', password: '', phone_number: '', country: '', city: '',
    bio: '', image: '', cover: '', commercial_registration_number: '', is_active: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const REQUIRED = ['office_name', 'email', 'password', 'phone_number', 'country', 'city'];

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const key of REQUIRED) {
      if (!form[key as keyof typeof form]?.toString().trim()) {
        errs[key] = 'هذا الحقل مطلوب';
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
      const res = await fetch('/api/create-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    if (key === 'country') setForm((prev) => ({ ...prev, city: '' }));
  };

  const cities = useMemo(() => {
    const country = gulfCountries.find((c) => c.code === form.country || c.ar === form.country || c.en === form.country);
    return country?.cities || [];
  }, [form.country]);

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
            <select value={form.country} onChange={(e) => handleChange('country', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.country ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}>
              <option value="">-- اختر الدولة --</option>
              {gulfCountries.map((c) => (
                <option key={c.code} value={c.code}>{c.ar}</option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.city} <span className="text-red-400">*</span></label>
            <select value={form.city} onChange={(e) => handleChange('city', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.city ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}>
              <option value="">-- اختر المدينة --</option>
              {cities.map((ct) => (
                <option key={ct.en} value={ct.ar}>{ct.ar}</option>
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
