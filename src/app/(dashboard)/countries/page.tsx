'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { countriesService } from '@/services/countries.service';
import { citiesService } from '@/services/cities.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { Country } from '@/types';
import type { ApiError } from '@/types';
import Link from 'next/link';
import { FiPlus, FiEye } from 'react-icons/fi';

interface CountryForm {
  name_ar: string;
  name_en: string;
  code: string;
  phone_code: string;
  currency_code: string;
  flag_emoji: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: CountryForm = {
  name_ar: '', name_en: '', code: '', phone_code: '',
  currency_code: '', flag_emoji: '', sort_order: 0, is_active: true,
};

export default function CountriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [form, setForm] = useState<CountryForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ country: Country } | null>(null);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['countries', page, search],
    queryFn: () => countriesService.list({ page, limit }),
  });

  const { data: cityCounts = {} } = useQuery({
    queryKey: ['city-counts'],
    queryFn: () => citiesService.getCountsByCountry(),
    staleTime: 60000,
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter((c) =>
      c.name_ar.toLowerCase().includes(q) || c.name_en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [data, search]);

  const openAddModal = () => {
    setForm(emptyForm);
    setErrors({});
    setModalMode('add');
  };

  const openEditModal = (country: Country) => {
    setForm({
      name_ar: country.name_ar,
      name_en: country.name_en,
      code: country.code,
      phone_code: country.phone_code || '',
      currency_code: country.currency_code || '',
      flag_emoji: country.flag_emoji || '',
      sort_order: country.sort_order ?? 0,
      is_active: country.is_active,
    });
    setSelectedCountry(country);
    setErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCountry(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = async () => {
    const errs: Record<string, string> = {};
    if (!form.name_ar.trim()) errs.name_ar = t.countries.validation.nameArRequired;
    if (!form.name_en.trim()) errs.name_en = t.countries.validation.nameEnRequired;
    if (!form.code.trim()) errs.code = t.countries.validation.codeRequired;
    else if (form.code.trim().length !== 2) errs.code = t.countries.validation.codeLength;
    if (form.sort_order != null && isNaN(Number(form.sort_order))) errs.sort_order = t.countries.validation.sortOrderNumber;

    if (!errs.code) {
      const exists = await countriesService.checkCodeExists(form.code.trim().toUpperCase(), selectedCountry?.id);
      if (exists) errs.code = t.countries.validation.codeExists;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, code: form.code.trim().toUpperCase() };
      if (modalMode === 'add') return countriesService.create(payload);
      return countriesService.update(selectedCountry!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      showToast(t.common.success, 'success');
      closeModal();
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => countriesService.toggleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    {
      key: 'flag_emoji',
      label: t.countries.flagEmoji,
      render: (c: Country) => <span className="text-xl">{c.flag_emoji || '-'}</span>,
    },
    { key: 'name_ar', label: t.countries.nameAr },
    { key: 'name_en', label: t.countries.nameEn },
    { key: 'code', label: t.countries.code },
    { key: 'phone_code', label: t.countries.phoneCode },
    { key: 'currency_code', label: t.countries.currencyCode },
    {
      key: '_city_count',
      label: t.countries.cityCount,
      render: (c: Country) => <span>{cityCounts[c.id] ?? 0}</span>,
    },
    {
      key: 'is_active',
      label: t.common.status,
      render: (c: Country) => (
        <Badge variant={c.is_active ? 'success' : 'error'}>
          {c.is_active ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    { key: 'sort_order', label: t.countries.sortOrder },
    {
      key: '_actions',
      label: t.common.actions,
      render: (c: Country) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
            className="rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/20 transition-colors"
          >
            {t.common.edit}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmAction({ country: c }); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${
              c.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {c.is_active ? t.common.deactivate : t.common.activate}
          </button>
          <Link
            href={`/countries/${c.id}/cities`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-lg bg-gray-700/50 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <FiEye size={12} />
            {t.countries.viewCities}
          </Link>
        </div>
      ),
    },
  ];

  const handleChange = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.countries.countries}</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <FiPlus size={18} />
          {t.countries.addCountry}
        </button>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={`${t.common.search} ${t.countries.countries}...`} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">خطأ في جلب البيانات</p>
          <p className="mt-1">
            {(error as unknown as ApiError)?.message || (error as Error)?.message || 'فشل جلب البيانات من Supabase'}
          </p>
          {(error as unknown as ApiError)?.status && (
            <p className="mt-1 text-xs opacity-70">كود الخطأ: {(error as unknown as ApiError).status}</p>
          )}
          {(error as unknown as ApiError)?.details ? (
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-red-950/50 p-2 text-xs">
              {typeof (error as unknown as ApiError).details === 'string'
                ? (error as unknown as ApiError).details as string
                : JSON.stringify((error as unknown as ApiError).details, null, 2)}
            </pre>
          ) : null}
          <p className="mt-2 text-xs opacity-60">
            تأكد من متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY
          </p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredData}
          loading={isLoading}
          pagination={{
            currentPage: page,
            totalPages: Math.ceil((data?.count || 0) / limit),
            onPageChange: setPage,
          }}
        />
      )}

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'add' ? t.countries.addCountry : t.countries.editCountry}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.nameAr} <span className="text-red-400">*</span></label>
            <input
              type="text" value={form.name_ar}
              onChange={(e) => handleChange('name_ar', e.target.value)}
              className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.name_ar ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}
            />
            {errors.name_ar && <p className="mt-1 text-xs text-red-400">{errors.name_ar}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.nameEn} <span className="text-red-400">*</span></label>
            <input
              type="text" value={form.name_en}
              onChange={(e) => handleChange('name_en', e.target.value)}
              className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.name_en ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}
            />
            {errors.name_en && <p className="mt-1 text-xs text-red-400">{errors.name_en}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.code} <span className="text-red-400">*</span></label>
            <input
              type="text" value={form.code} maxLength={2}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.code ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}
            />
            {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.phoneCode}</label>
            <input
              type="text" value={form.phone_code}
              onChange={(e) => handleChange('phone_code', e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.currencyCode}</label>
            <input
              type="text" value={form.currency_code}
              onChange={(e) => handleChange('currency_code', e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.flagEmoji}</label>
            <input
              type="text" value={form.flag_emoji}
              onChange={(e) => handleChange('flag_emoji', e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.countries.sortOrder}</label>
            <input
              type="number" value={form.sort_order}
              onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
              className={`w-full rounded-xl border px-4 py-2.5 text-white focus:outline-none ${errors.sort_order ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`}
            />
            {errors.sort_order && <p className="mt-1 text-xs text-red-400">{errors.sort_order}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" checked={form.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="rounded border-gray-700 bg-gray-800"
            />
            <label className="text-sm text-gray-400">{t.common.active}</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={closeModal} className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">{t.common.cancel}</button>
          <button
            onClick={async () => { if (await validate()) saveMutation.mutate(); }}
            disabled={saveMutation.isPending}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? t.common.loading : t.common.save}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            toggleMutation.mutate({ id: confirmAction.country.id, isActive: !confirmAction.country.is_active });
            setConfirmAction(null);
          }
        }}
        title={confirmAction?.country?.is_active ? t.common.deactivate : t.common.activate}
        message={t.countries.confirmToggle}
        variant="warning"
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
