'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { countriesService } from '@/services/countries.service';
import { citiesService } from '@/services/cities.service';
import type { OfficeBranch, OfficeSummary, OfficeBranchFormValues, Country, City } from '@/types';

interface OfficeBranchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OfficeBranchFormValues) => Promise<void>;
  branch?: OfficeBranch | null;
  offices: OfficeSummary[];
  officesLoading: boolean;
  saving: boolean;
}

const emptyForm: OfficeBranchFormValues = {
  parent_office_id: '',
  branch_name: '',
  email: '',
  phone_number: '',
  country: '',
  city: '',
  is_active: false,
  bio: '',
  image: null,
  cover: null,
};

export function OfficeBranchForm({
  isOpen, onClose, onSave, branch, offices, officesLoading, saving,
}: OfficeBranchFormProps) {
  const { t, locale } = useTranslation();
  const tb = t.officeBranches;
  const isEdit = !!branch;

  const [form, setForm] = useState<OfficeBranchFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const { data: countriesList = [] } = useQuery({
    queryKey: ['branch-form-countries'],
    queryFn: () => countriesService.getAllActive(),
    staleTime: 60000,
  });

  const selectedCountryObj = countriesList.find((c) => c.code === form.country);

  const { data: citiesList = [] } = useQuery({
    queryKey: ['branch-form-cities', selectedCountryObj?.id],
    queryFn: () => selectedCountryObj ? citiesService.getByCountry(selectedCountryObj.id) : Promise.resolve([]),
    enabled: !!selectedCountryObj,
    staleTime: 30000,
  });

  const selectedCityObj = citiesList.find((ct) => ct.name_ar === form.city);

  const sortedOffices = useMemo(() => {
    return [...offices].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (a.office_name || '').localeCompare(b.office_name || '', 'ar');
    });
  }, [offices]);

  useEffect(() => {
    if (isOpen) {
      if (branch) {
        setForm({
          parent_office_id: branch.parent_office_id,
          branch_name: branch.branch_name,
          email: branch.email || '',
          phone_number: branch.phone_number || '',
          country: branch.country || '',
          city: branch.city || '',
          is_active: branch.is_active,
          bio: branch.linked_office?.bio || '',
          image: branch.linked_office?.image ?? null,
          cover: branch.linked_office?.cover ?? null,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen, branch, countriesList]);

  const update = (key: keyof OfficeBranchFormValues, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): OfficeBranchFormValues | null => {
    const errs: Record<string, string> = {};

    if (!form.parent_office_id) errs.parent_office_id = tb.parentOfficeRequired;

    if (!form.branch_name || !form.branch_name.trim()) {
      errs.branch_name = tb.branchNameRequired;
    } else if (form.branch_name.trim().length < 2) {
      errs.branch_name = tb.branchNameMinLength;
    } else if (form.branch_name.trim().length > 100) {
      errs.branch_name = tb.branchNameMaxLength;
    }

    const countryExists = form.country && countriesList.some((c) => c.code === form.country);
    if (!countryExists) errs.country = tb.countryRequired;

    if (countryExists) {
      const country = countriesList.find((c) => c.code === form.country);
      const cityBelongsToCountry = form.city && country
        ? citiesList.some((ct) => ct.country_id === country.id && ct.name_ar === form.city)
        : false;
      if (!cityBelongsToCountry) errs.city = tb.cityRequiredFromList;
    } else if (form.city) {
      errs.city = tb.cityRequiredFromList;
    } else {
      errs.city = tb.cityRequiredFromList;
    }

    if (!isEdit) {
      const emailVal = form.email?.trim().toLowerCase() || '';
      if (!emailVal) {
        errs.email = tb.loginEmailRequired;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        errs.email = tb.emailInvalid;
      }
    }

    if (form.phone_number) {
      const cleaned = form.phone_number.replace(/[\s\-()]/g, '');
      if (cleaned && !/^[\d+]+$/.test(cleaned)) {
        errs.phone_number = tb.phoneInvalid;
      }
    }

    if (form.bio && form.bio.length > 1000) {
      errs.bio = tb.bioMaxLength;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;

    if (isEdit) {
      return {
        branch_name: form.branch_name.trim(),
        email: form.email?.trim().toLowerCase() || '',
        phone_number: form.phone_number?.trim() || '',
        country: form.country,
        city: form.city,
        is_active: form.is_active,
        bio: form.bio?.trim() || '',
        image: form.image ?? null,
        cover: form.cover ?? null,
      } as OfficeBranchFormValues;
    }

    return {
      parent_office_id: form.parent_office_id,
      branch_name: form.branch_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone_number: form.phone_number?.trim() || '',
      country: form.country,
      city: form.city,
      is_active: form.is_active,
      bio: form.bio?.trim() || '',
      image: form.image ?? null,
      cover: form.cover ?? null,
    } as OfficeBranchFormValues;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const validated = validate();
    if (!validated) return;
    try {
      await onSave(validated);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      console.error(
        '[OfficeBranchForm] Submit failed',
        JSON.stringify(
          {
            code: err?.code,
            message: err?.message,
            debug: err?.debug,
            status: err?.status,
            details: err?.details,
            hint: err?.hint,
            stack: err?.stack,
          },
          null,
          2,
        ),
      );
      if (code === 'protected_fields') {
        setSubmitError(`${tb.unexpectedError} (${msg})`);
      } else if (code === 'branch_name_duplicate' || code === '23505' || msg.includes('duplicate key')) {
        setSubmitError(tb.duplicateName);
      } else if (code === 'branch_email_same_as_parent') {
        setSubmitError(tb.branchEmailSameAsParent);
      } else if (code === 'branch_login_email_exists') {
        setSubmitError(tb.loginEmailExists);
      } else if (code === 'parent_office_not_found') {
        setSubmitError(tb.parentOfficeNotFound);
      } else if (code === 'auth_user_creation_failed') {
        console.error('[OfficeBranchForm] Auth user creation error detail:', msg, err?.debug);
        setSubmitError(`${tb.authUserFailed} (${msg})`);
      } else if (code === 'offices_insert_failed' || code === 'branch_insert_failed') {
        setSubmitError(tb.officesInsertFailed);
      } else if (code === 'linked_data_exists') {
        setSubmitError(tb.linkedDataExists);
      } else if (code === 'office_sync_failed' || msg.includes('rolledBack') || err.rolledBack) {
        setSubmitError(tb.syncFailed);
      } else if (code === 'admin_required' || code === '42501' || msg.includes('permission denied')) {
        setSubmitError(tb.permissionDenied);
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setSubmitError(tb.connectionFailed);
      } else {
        console.error('[OfficeBranchForm] Unexpected error', err);
        setSubmitError(`${tb.unexpectedError} (${msg})`);
      }
    }
  };

  const handleOfficeChange = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    const newCountry = office?.country || '';
    setForm((prev) => ({
      ...prev,
      parent_office_id: officeId,
      country: newCountry,
      city: '',
    }));
    if (errors.parent_office_id) setErrors((prev) => ({ ...prev, parent_office_id: '' }));
  };

  const handleCountryChange = (code: string) => {
    setForm((prev) => ({ ...prev, country: code, city: '' }));
    if (errors.country) setErrors((prev) => ({ ...prev, country: '' }));
    if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
  };

  const officeOptions: SearchableSelectOption[] = sortedOffices.map((o) => ({
    value: o.id,
    label: o.office_name || '',
    sublabel: o.city ? `${o.city} — ${o.commercial_registration_number || ''}` : o.commercial_registration_number || '',
    image: o.image,
    badge: o.is_active
      ? { label: t.common.active, variant: 'success' as const }
      : { label: t.common.inactive, variant: 'error' as const },
  }));

  const countryOptions: SearchableSelectOption[] = countriesList.map((c) => ({
    value: c.code,
    label: `${c.flag_emoji || ''} ${locale === 'ar' ? c.name_ar : c.name_en}`,
    sublabel: c.code,
  }));

  const cityOptions: SearchableSelectOption[] = citiesList.map((ct) => ({
    value: ct.name_ar,
    label: locale === 'ar' ? ct.name_ar : ct.name_en,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? tb.editBranch : tb.addBranch} size="lg">
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-400">
            {tb.parentOffice} <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={officeOptions}
            value={form.parent_office_id}
            onChange={handleOfficeChange}
            placeholder={tb.selectOffice}
            searchPlaceholder="ابحث باسم المكتب أو المدينة أو رقم السجل"
            noResultsText="لا توجد مكاتب مطابقة للبحث."
            disabled={officesLoading || isEdit}
            error={errors.parent_office_id}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-400">
              {tb.branchName} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.branch_name}
              onChange={(e) => update('branch_name', e.target.value)}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                errors.branch_name ? 'border-red-500' : 'border-gray-700'
              } bg-gray-800 text-white focus:border-blue-600`}
            />
            {errors.branch_name && <p className="mt-1 text-xs text-red-400">{errors.branch_name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-400">{tb.phone}</label>
            <input
              type="text"
              value={form.phone_number || ''}
              onChange={(e) => update('phone_number', e.target.value)}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                errors.phone_number ? 'border-red-500' : 'border-gray-700'
              } bg-gray-800 text-white focus:border-blue-600`}
            />
            {errors.phone_number && <p className="mt-1 text-xs text-red-400">{errors.phone_number}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-400">
              {tb.country} <span className="text-red-400">*</span>
            </label>
            <SearchableSelect
              options={countryOptions}
              value={form.country}
              onChange={handleCountryChange}
              placeholder={tb.selectCountry}
              searchPlaceholder={t.common.search}
              noResultsText={t.common.noData}
              error={errors.country}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-400">
              {tb.city} <span className="text-red-400">*</span>
            </label>
            <SearchableSelect
              options={cityOptions}
              value={form.city}
              onChange={(v) => update('city', v)}
              placeholder={!form.country ? '-- اختر الدولة أولاً --' : tb.selectCity}
              searchPlaceholder={t.common.search}
              noResultsText={t.common.noData}
              disabled={!form.country}
              error={errors.city}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-gray-400">{tb.bio}</label>
            <textarea
              rows={3}
              value={form.bio || ''}
              onChange={(e) => update('bio', e.target.value)}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                errors.bio ? 'border-red-500' : 'border-gray-700'
              } bg-gray-800 text-white focus:border-blue-600`}
            />
            {errors.bio && <p className="mt-1 text-xs text-red-400">{errors.bio}</p>}
          </div>
        </div>

        {isEdit ? (
          <div className="rounded-lg border border-blue-600/20 bg-blue-600/5 p-4">
            <h3 className="mb-3 text-sm font-bold text-white">{tb.loginSectionTitle}</h3>
            <p className="mb-1 text-xs text-gray-400">{tb.loginEmail}: <span className="font-medium text-blue-400" dir="ltr">{branch?.email || '—'}</span></p>
            <p className="mt-2 text-xs text-yellow-400/80">تغيير بريد تسجيل الدخول يحتاج إجراء منفصل عبر إدارة المستخدمين.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-blue-600/20 bg-blue-600/5 p-4">
            <h3 className="mb-3 text-sm font-bold text-white">{tb.loginSectionTitle}</h3>
            <p className="mb-4 text-xs text-gray-400">{tb.loginSectionHint}</p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-400">
                {tb.loginEmail} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => update('email', e.target.value)}
                placeholder="branch@example.com"
                dir="ltr"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                  errors.email ? 'border-red-500' : 'border-gray-700'
                } bg-gray-800 text-white focus:border-blue-600`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              <p className="mt-1.5 text-xs text-yellow-400/80">{tb.loginEmailHint}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <ImageUpload
            bucket="Offices"
            folder={`office-branches/${branch?.id || 'temp'}`}
            value={form.image || ''}
            onChange={(url) => update('image', url)}
            label={tb.image}
          />
          <ImageUpload
            bucket="Offices"
            folder={`office-branches/${branch?.id || 'temp'}`}
            value={form.cover || ''}
            onChange={(url) => update('cover', url)}
            label={tb.cover}
          />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-gray-800"
          />
          <span className="text-sm font-semibold text-gray-400">{tb.isActive}</span>
        </label>

        {submitError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
