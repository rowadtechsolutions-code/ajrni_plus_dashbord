'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { officesService } from '@/services/offices.service';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { gulfCountries } from '@/data/gulf';
import type { Office } from '@/types';
import { FiArrowLeft } from 'react-icons/fi';

export default function EditOfficePage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: office, isLoading } = useQuery({
    queryKey: ['office', params.id],
    queryFn: () => officesService.getById(params.id as string),
    enabled: !!params.id,
  });

  const [form, setForm] = useState<Partial<Office> | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentForm = form ?? office ?? null;

  const cities = useMemo(() => {
    const country = gulfCountries.find((c) => c.code === currentForm?.country || c.ar === currentForm?.country || c.en === currentForm?.country);
    return country?.cities || [];
  }, [currentForm?.country]);

  const REQUIRED = ['office_name', 'email', 'phone_number', 'country', 'city'];

  const validate = () => {
    const errs: Record<string, string> = {};
    const target = form ?? office ?? null;
    for (const key of REQUIRED) {
      if (!(target as any)?.[key]?.toString().trim()) {
        errs[key] = 'هذا الحقل مطلوب';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) setShowConfirm(true);
  };

  const updateMutation = useMutation({
    mutationFn: () => officesService.update(params.id as string, form ?? office!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      showToast(t.common.edit + ' ' + t.common.success, 'success');
      router.push('/offices');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...(prev || office || {}), [key]: value } as Partial<Office>));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    if (key === 'country') setForm((prev) => ({ ...(prev || office || {}), [key]: value, city: '' } as Partial<Office>));
  };

  if (isLoading) return <div className="text-gray-400">{t.common.loading}</div>;
  if (!office) return <div className="text-gray-400">{t.common.noData}</div>;

  const display = currentForm!;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white">
        <FiArrowLeft size={18} /> {t.common.back}
      </button>
      <h1 className="text-2xl font-bold text-white">{t.offices.editOffice}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.officeName} <span className="text-red-400">*</span></label>
            <input type="text" value={display.office_name || ''} onChange={(e) => handleChange('office_name', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.office_name ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.office_name && <p className="mt-1 text-xs text-red-400">{errors.office_name}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.email} <span className="text-red-400">*</span></label>
            <input type="email" value={display.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.phone} <span className="text-red-400">*</span></label>
            <input type="text" value={display.phone_number || ''} onChange={(e) => handleChange('phone_number', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.phone_number ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`} />
            {errors.phone_number && <p className="mt-1 text-xs text-red-400">{errors.phone_number}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.country} <span className="text-red-400">*</span></label>
            <select value={display.country || ''} onChange={(e) => handleChange('country', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.country ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}>
              <option value="">-- اختر الدولة --</option>
              {gulfCountries.map((c) => (
                <option key={c.code} value={c.code}>{c.ar}</option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offices.city} <span className="text-red-400">*</span></label>
            <select value={display.city || ''} onChange={(e) => handleChange('city', e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.city ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}>
              <option value="">-- اختر المدينة --</option>
              {cities.map((ct) => (
                <option key={ct.en} value={ct.ar}>{ct.ar}</option>
              ))}
            </select>
            {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.bio}</label>
            <textarea value={display.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div>
            <ImageUpload value={display.image || ''} onChange={(url) => handleChange('image', url)} label={t.offices.image} folder={`offices/${office.id}`} />
          </div>
          <div>
            <ImageUpload value={display.cover || ''} onChange={(url) => handleChange('cover', url)} label={t.offices.cover} folder={`offices/${office.id}`} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.offices.commercialReg}</label>
            <input type="text" value={display.commercial_registration_number || ''} onChange={(e) => handleChange('commercial_registration_number', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={display.is_active || false} onChange={(e) => handleChange('is_active', e.target.checked)} className="rounded border-gray-700 bg-gray-800" />
            <label className="text-sm text-gray-400">{t.offices.isActive}</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => router.back()} className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white">{t.common.cancel}</button>
          <button onClick={handleSave} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {t.common.save}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => updateMutation.mutate()}
        title={t.offices.editOffice}
        message="هل أنت متأكد من حفظ التعديلات؟"
        variant="info"
        loading={updateMutation.isPending}
      />
    </div>
  );
}
