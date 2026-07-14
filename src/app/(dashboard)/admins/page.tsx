'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FiAlertCircle, FiEdit2, FiPlus, FiPower, FiShield, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n/provider';
import { adminsService, type AdminCreatePayload, type AdminUpdatePayload } from '@/services/admins.service';
import { countriesService } from '@/services/countries.service';
import { citiesService } from '@/services/cities.service';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/hooks/useToast';
import type { Admin } from '@/types';

type DataScope = 'global' | 'country' | 'city';
type ModalMode = 'create' | 'edit' | null;

interface AdminFormState {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  data_scope: DataScope;
  country_id: string;
  city_id: string;
  is_active: boolean;
}

const LIMIT = 10;

const emptyForm: AdminFormState = {
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  data_scope: 'global',
  country_id: '',
  city_id: '',
  is_active: true,
};

const labels = {
  ar: {
    title: 'المشرفون والصلاحيات',
    addAdmin: 'إضافة مشرف',
    editAdmin: 'تعديل مشرف',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    role: 'الدور',
    dataScope: 'نطاق البيانات',
    country: 'الدولة',
    city: 'المدينة',
    status: 'الحالة',
    lastLogin: 'آخر تسجيل دخول',
    actions: 'الإجراءات',
    active: 'فعال',
    inactive: 'موقوف',
    superAdmin: 'مشرف رئيسي',
    admin: 'مشرف',
    global: 'جميع البيانات',
    countryScope: 'دولة محددة',
    cityScope: 'مدينة محددة',
    selectScope: 'اختر نطاق البيانات',
    selectCountry: 'اختر الدولة',
    selectCity: 'اختر المدينة',
    cityNeedsCountry: 'اختر الدولة أولًا',
    edit: 'تعديل',
    activate: 'تفعيل',
    deactivate: 'إيقاف',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث عن مشرف...',
    noAccessTitle: 'غير مصرح',
    noAccessBody: 'هذه الصفحة متاحة للمشرف الرئيسي فقط.',
    deleteTitle: 'حذف المشرف',
    deleteMessage: 'هل أنت متأكد أنك تريد حذف هذا المشرف؟',
    required: 'هذا الحقل مطلوب',
    invalidEmail: 'البريد الإلكتروني غير صحيح',
    passwordLength: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    passwordLetter: 'كلمة المرور يجب أن تحتوي على حرف إنجليزي واحد على الأقل',
    passwordNumber: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    cityMismatch: 'المدينة لا تتبع الدولة المحددة',
    success: 'تم الحفظ بنجاح',
    deleteSuccess: 'تم الحذف بنجاح',
    toggleSuccess: 'تم تحديث الحالة بنجاح',
    error: 'حدث خطأ غير متوقع',
    currentAccount: 'الحساب الحالي',
    protectedAccount: 'محمي',
    loading: 'جاري التحميل...',
  },
  en: {
    title: 'Admins & Permissions',
    addAdmin: 'Add Admin',
    editAdmin: 'Edit Admin',
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    role: 'Role',
    dataScope: 'Data Scope',
    country: 'Country',
    city: 'City',
    status: 'Status',
    lastLogin: 'Last Login',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    global: 'All Data',
    countryScope: 'Specific Country',
    cityScope: 'Specific City',
    selectScope: 'Select data scope',
    selectCountry: 'Select country',
    selectCity: 'Select city',
    cityNeedsCountry: 'Select country first',
    edit: 'Edit',
    activate: 'Activate',
    deactivate: 'Deactivate',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search admins...',
    noAccessTitle: 'Not Allowed',
    noAccessBody: 'This page is only available to the super admin.',
    deleteTitle: 'Delete Admin',
    deleteMessage: 'Are you sure you want to delete this admin?',
    required: 'This field is required',
    invalidEmail: 'Email is invalid',
    passwordLength: 'Password must be at least 8 characters',
    passwordLetter: 'Password must include at least one English letter',
    passwordNumber: 'Password must include at least one number',
    passwordMismatch: 'Passwords do not match',
    cityMismatch: 'City does not belong to the selected country',
    success: 'Saved successfully',
    deleteSuccess: 'Deleted successfully',
    toggleSuccess: 'Status updated successfully',
    error: 'An unexpected error occurred',
    currentAccount: 'Current account',
    protectedAccount: 'Protected',
    loading: 'Loading...',
  },
};

function useDebouncedValue(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function getApiMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function AdminsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useTranslation();
  const l = labels[locale];
  const { showToast } = useToast();
  const { admin: currentAdmin, loading: authLoading, isSuperAdmin: canManageAdmins } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [deleteAdmin, setDeleteAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState<AdminFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !canManageAdmins) router.replace('/');
  }, [authLoading, canManageAdmins, router]);


  const adminsQuery = useQuery({
    queryKey: ['admins-management', page, debouncedSearch],
    enabled: !authLoading && canManageAdmins,
    queryFn: () => adminsService.list({ page, limit: LIMIT, search: debouncedSearch }),
  });

  const countriesQuery = useQuery({
    queryKey: ['admins-countries'],
    enabled: !authLoading && canManageAdmins,
    queryFn: () => countriesService.getAllActive(),
    staleTime: 60000,
  });

  const citiesQuery = useQuery({
    queryKey: ['admins-cities'],
    enabled: !authLoading && canManageAdmins,
    queryFn: () => citiesService.list({ limit: 10000, is_active: 'true' }),
    staleTime: 60000,
  });

  const countries = useMemo(() => countriesQuery.data || [], [countriesQuery.data]);
  const cities = useMemo(() => citiesQuery.data?.data || [], [citiesQuery.data]);

  const countryMap = useMemo(() => new Map(countries.map((country) => [country.id, country])), [countries]);
  const cityMap = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);

  const countryOptions: SearchableSelectOption[] = useMemo(() => countries.map((country) => ({
    value: country.id,
    label: locale === 'ar' ? country.name_ar : country.name_en,
    sublabel: country.code,
  })), [countries, locale]);

  const cityOptions: SearchableSelectOption[] = useMemo(() => cities
    .filter((city) => !form.country_id || city.country_id === form.country_id)
    .map((city) => ({
      value: city.id,
      label: locale === 'ar' ? city.name_ar : city.name_en,
      sublabel: countryMap.get(city.country_id)?.code || '',
    })), [cities, countryMap, form.country_id, locale]);

  const openCreate = () => {
    setSelectedAdmin(null);
    setForm(emptyForm);
    setErrors({});
    setModalMode('create');
  };

  const openEdit = (admin: Admin) => {
    setSelectedAdmin(admin);
    setForm({
      full_name: admin.full_name || '',
      email: admin.email || '',
      password: '',
      confirmPassword: '',
      data_scope: (admin.data_scope || 'global') as DataScope,
      country_id: admin.country_id || '',
      city_id: admin.city_id || '',
      is_active: admin.is_active,
    });
    setErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedAdmin(null);
    setForm(emptyForm);
    setErrors({});
  };

  const setField = <K extends keyof AdminFormState>(key: K, value: AdminFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'data_scope') {
        next.country_id = '';
        next.city_id = '';
      }
      if (key === 'country_id') next.city_id = '';
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const isCreate = modalMode === 'create';

    if (!form.full_name.trim()) nextErrors.full_name = l.required;
    if (isCreate) {
      if (!form.email.trim()) nextErrors.email = l.required;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = l.invalidEmail;
      if (!form.password) nextErrors.password = l.required;
      else if (form.password.length < 8) nextErrors.password = l.passwordLength;
      else if (!/[A-Za-z]/.test(form.password)) nextErrors.password = l.passwordLetter;
      else if (!/\d/.test(form.password)) nextErrors.password = l.passwordNumber;
      if (!form.confirmPassword) nextErrors.confirmPassword = l.required;
      else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = l.passwordMismatch;
    }

    if (!['global', 'country', 'city'].includes(form.data_scope)) nextErrors.data_scope = l.required;
    if (form.data_scope !== 'global' && !form.country_id) nextErrors.country_id = l.required;
    if (form.data_scope === 'city') {
      if (!form.city_id) nextErrors.city_id = l.required;
      else {
        const selectedCity = cityMap.get(form.city_id);
        if (!selectedCity || selectedCity.country_id !== form.country_id) nextErrors.city_id = l.cityMismatch;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminCreatePayload) => adminsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-management'] });
      showToast(l.success, 'success');
      closeModal();
    },
    onError: (err) => showToast(getApiMessage(err, l.error), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: AdminUpdatePayload) => adminsService.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-management'] });
      showToast(l.success, 'success');
      closeModal();
    },
    onError: (err) => showToast(getApiMessage(err, l.error), 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminsService.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-management'] });
      showToast(l.toggleSuccess, 'success');
    },
    onError: (err) => showToast(getApiMessage(err, l.error), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-management'] });
      showToast(l.deleteSuccess, 'success');
      setDeleteAdmin(null);
    },
    onError: (err) => showToast(getApiMessage(err, l.error), 'error'),
  });

  const submitForm = async () => {
    if (!validateForm()) return;

    const normalizedScope = {
      data_scope: form.data_scope,
      country_id: form.data_scope === 'global' ? null : form.country_id,
      city_id: form.data_scope === 'city' ? form.city_id : null,
    };

    if (modalMode === 'create') {
      await createMutation.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        is_active: form.is_active,
        ...normalizedScope,
      });
      return;
    }

    if (selectedAdmin) {
      await updateMutation.mutateAsync({
        id: selectedAdmin.id,
        full_name: form.full_name.trim(),
        is_active: form.is_active,
        ...normalizedScope,
      });
    }
  };

  const scopeLabel = (scope?: string | null) => {
    if (scope === 'country') return l.countryScope;
    if (scope === 'city') return l.cityScope;
    return l.global;
  };

  const roleLabel = (role: string) => role === 'super_admin' ? l.superAdmin : l.admin;

  const countryName = (countryId?: string | null) => {
    if (!countryId) return '-';
    const country = countryMap.get(countryId);
    if (!country) return countryId;
    return locale === 'ar' ? country.name_ar : country.name_en;
  };

  const cityName = (cityId?: string | null) => {
    if (!cityId) return '-';
    const city = cityMap.get(cityId);
    if (!city) return cityId;
    return locale === 'ar' ? city.name_ar : city.name_en;
  };

  const canToggleRow = (row: Admin) => row.id !== currentAdmin?.id && row.role !== 'super_admin';
  const canDeleteRow = canToggleRow;
  const saving = createMutation.isPending || updateMutation.isPending;
  const lockSuperAdminFields = selectedAdmin?.role === 'super_admin';

  const columns = [
    {
      key: 'full_name',
      label: l.fullName,
      render: (row: Admin) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-white">{row.full_name || '-'}</span>
            {row.id === currentAdmin?.id && <Badge variant="info">{l.currentAccount}</Badge>}
          </div>
          <span className="text-xs text-gray-500">{row.id}</span>
        </div>
      ),
    },
    { key: 'email', label: l.email },
    {
      key: 'role',
      label: l.role,
      render: (row: Admin) => <Badge variant={row.role === 'super_admin' ? 'warning' : 'neutral'}>{roleLabel(row.role)}</Badge>,
    },
    {
      key: 'data_scope',
      label: l.dataScope,
      render: (row: Admin) => <Badge variant="info">{scopeLabel(row.data_scope)}</Badge>,
    },
    { key: 'country_id', label: l.country, render: (row: Admin) => countryName(row.country_id) },
    { key: 'city_id', label: l.city, render: (row: Admin) => cityName(row.city_id) },
    {
      key: 'is_active',
      label: l.status,
      render: (row: Admin) => <Badge variant={row.is_active ? 'success' : 'error'}>{row.is_active ? l.active : l.inactive}</Badge>,
    },
    {
      key: 'last_login',
      label: l.lastLogin,
      render: (row: Admin) => row.last_login ? format(new Date(row.last_login), 'yyyy-MM-dd HH:mm') : '-',
    },
    {
      key: '_actions',
      label: l.actions,
      sortable: false,
      render: (row: Admin) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); openEdit(row); }}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-600/20"
          >
            <FiEdit2 size={12} />
            {l.edit}
          </button>
          <button
            type="button"
            disabled={!canToggleRow(row) || toggleMutation.isPending}
            onClick={(event) => { event.stopPropagation(); toggleMutation.mutate({ id: row.id, isActive: !row.is_active }); }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600/10 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-40"
            title={!canToggleRow(row) ? l.protectedAccount : undefined}
          >
            <FiPower size={12} />
            {row.is_active ? l.deactivate : l.activate}
          </button>
          <button
            type="button"
            disabled={!canDeleteRow(row)}
            onClick={(event) => { event.stopPropagation(); setDeleteAdmin(row); }}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-600/20 disabled:cursor-not-allowed disabled:opacity-40"
            title={!canDeleteRow(row) ? l.protectedAccount : undefined}
          >
            <FiTrash2 size={12} />
            {l.delete}
          </button>
        </div>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-8 py-7 shadow-xl">
          <div className="dashboard-loading-spinner h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-600" />
          <p className="text-sm font-medium text-gray-400">{l.loading}</p>
        </div>
      </div>
    );
  }

  if (!canManageAdmins) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-500/25 bg-red-500/10 p-8 text-center">
          <FiShield className="mx-auto mb-4 text-red-400" size={42} />
          <h1 className="text-xl font-bold text-white">{l.noAccessTitle}</h1>
          <p className="mt-2 text-sm text-gray-400">{l.noAccessBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{l.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{roleLabel(currentAdmin?.role || 'admin')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <FiPlus size={18} />
          {l.addAdmin}
        </button>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={l.search} />
      </div>

      {adminsQuery.error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <div className="flex items-center gap-2 font-semibold">
            <FiAlertCircle size={18} />
            {getApiMessage(adminsQuery.error, l.error)}
          </div>
        </div>
      ) : (
        <Table
          columns={columns}
          data={adminsQuery.data?.data || []}
          loading={adminsQuery.isLoading || countriesQuery.isLoading || citiesQuery.isLoading}
          pagination={{
            currentPage: page,
            totalPages: Math.ceil((adminsQuery.data?.count || 0) / LIMIT),
            onPageChange: setPage,
          }}
        />
      )}

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'create' ? l.addAdmin : l.editAdmin}
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">{l.fullName}</label>
              <input
                value={form.full_name}
                onChange={(event) => setField('full_name', event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">{l.email}</label>
              <input
                value={form.email}
                disabled={modalMode === 'edit'}
                onChange={(event) => setField('email', event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
            {modalMode === 'create' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">{l.password}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setField('password', event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">{l.confirmPassword}</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setField('confirmPassword', event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">{l.dataScope}</label>
              <select
                value={form.data_scope}
                disabled={lockSuperAdminFields}
                onChange={(event) => setField('data_scope', event.target.value as DataScope)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="global">{l.global}</option>
                <option value="country">{l.countryScope}</option>
                <option value="city">{l.cityScope}</option>
              </select>
              {errors.data_scope && <p className="mt-1 text-xs text-red-400">{errors.data_scope}</p>}
            </div>

            {form.data_scope !== 'global' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">{l.country}</label>
                <SearchableSelect
                  options={countryOptions}
                  value={form.country_id}
                  disabled={lockSuperAdminFields}
                  onChange={(value) => setField('country_id', value)}
                  placeholder={l.selectCountry}
                  error={errors.country_id}
                />
              </div>
            )}

            {form.data_scope === 'city' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">{l.city}</label>
                <SearchableSelect
                  options={cityOptions}
                  value={form.city_id}
                  disabled={lockSuperAdminFields || !form.country_id}
                  onChange={(value) => setField('city_id', value)}
                  placeholder={!form.country_id ? l.cityNeedsCountry : l.selectCity}
                  error={errors.city_id}
                />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-gray-300">
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={lockSuperAdminFields}
              onChange={(event) => setField('is_active', event.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-600 disabled:opacity-60"
            />
            {l.active}
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-700 pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {l.cancel}
            </button>
            <button
              type="button"
              onClick={submitForm}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? l.loading : l.save}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteAdmin}
        onClose={() => setDeleteAdmin(null)}
        onConfirm={() => { if (deleteAdmin) deleteMutation.mutate(deleteAdmin.id); }}
        title={l.deleteTitle}
        message={`${l.deleteMessage} ${deleteAdmin?.full_name || ''}`}
        confirmText={l.delete}
        cancelText={l.cancel}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}