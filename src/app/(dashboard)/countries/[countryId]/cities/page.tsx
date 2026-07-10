'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import type { City } from '@/types';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';

interface CityForm {
  name_ar: string;
  name_en: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: CityForm = {
  name_ar: '', name_en: '', sort_order: 0, is_active: true,
};

export default function CitiesPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const countryId = params.countryId as string;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [form, setForm] = useState<CityForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ city: City } | null>(null);
  const limit = 10;

  const { data: country, isLoading: countryLoading } = useQuery({
    queryKey: ['country', countryId],
    queryFn: () => countriesService.getById(countryId),
    enabled: !!countryId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cities', countryId, page],
    queryFn: () => citiesService.list({ page, limit, country_id: countryId }),
    enabled: !!countryId,
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter((c) =>
      c.name_ar.toLowerCase().includes(q) || c.name_en.toLowerCase().includes(q)
    );
  }, [data, search]);

  const openAddModal = () => {
    setForm(emptyForm);
    setErrors({});
    setModalMode('add');
  };

  const openEditModal = (city: City) => {
    setForm({
      name_ar: city.name_ar,
      name_en: city.name_en,
      sort_order: city.sort_order ?? 0,
      is_active: city.is_active,
    });
    setSelectedCity(city);
    setErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCity(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = async () => {
    const errs: Record<string, string> = {};
    if (!form.name_ar.trim()) errs.name_ar = t.countries.validation.cityNameArRequired;
    if (form.sort_order != null && isNaN(Number(form.sort_order))) errs.sort_order = t.countries.validation.sortOrderNumber;

    if (!errs.name_ar) {
      const exists = await citiesService.checkDuplicateName(countryId, form.name_ar.trim(), selectedCity?.id);
      if (exists) errs.name_ar = t.countries.validation.cityNameExists;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, country_id: countryId };
      if (modalMode === 'add') return citiesService.create(payload);
      return citiesService.update(selectedCity!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities', countryId] });
      showToast(t.common.success, 'success');
      closeModal();
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => citiesService.toggleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities', countryId] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'name_ar', label: t.countries.nameAr },
    { key: 'name_en', label: t.countries.nameEn },
    {
      key: 'is_active',
      label: t.common.status,
      render: (c: City) => (
        <Badge variant={c.is_active ? 'success' : 'error'}>
          {c.is_active ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    { key: 'sort_order', label: t.countries.sortOrder },
    {
      key: '_actions',
      label: t.common.actions,
      render: (c: City) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
            className="rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/20 transition-colors"
          >
            {t.common.edit}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmAction({ city: c }); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium text-white transition-colors ${
              c.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {c.is_active ? t.common.deactivate : t.common.activate}
          </button>
        </div>
      ),
    },
  ];

  const handleChange = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  if (countryLoading) return <div className="text-gray-400">{t.common.loading}</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <FiArrowLeft size={18} />
        {t.common.back}
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.countries.cities}</h1>
          {country && (
            <p className="text-sm text-gray-400 mt-1">
              {t.countries.countryName}: {country.name_ar} ({country.name_en})
              {' | '}{t.countries.cityCount}: {data?.count ?? 0}
            </p>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <FiPlus size={18} />
          {t.countries.addCity}
        </button>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={`${t.common.search} ${t.countries.cities}...`} />
      </div>

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

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'add' ? t.countries.addCity : t.countries.editCity}
        size="md"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t.countries.countryName}</label>
            <input
              type="text" value={country?.name_ar || ''} disabled
              className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-400 cursor-not-allowed"
            />
          </div>
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
            <label className="block text-sm text-gray-400 mb-1">{t.countries.nameEn}</label>
            <input
              type="text" value={form.name_en}
              onChange={(e) => handleChange('name_en', e.target.value)}
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
            toggleMutation.mutate({ id: confirmAction.city.id, isActive: !confirmAction.city.is_active });
            setConfirmAction(null);
          }
        }}
        title={confirmAction?.city?.is_active ? t.common.deactivate : t.common.activate}
        message={t.countries.confirmToggleCity}
        variant="warning"
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
