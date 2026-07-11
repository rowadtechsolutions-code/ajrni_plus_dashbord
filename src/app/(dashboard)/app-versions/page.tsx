'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { appVersionsService } from '@/services/appVersions.service';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';
import { FiSmartphone, FiSave } from 'react-icons/fi';
import type { AppVersion } from '@/types';

interface PlatformForm {
  minimum_version: string;
  latest_version: string;
  minimum_build: string;
  latest_build: string;
  store_url: string;
  force_update: boolean;
}

const emptyForm: PlatformForm = {
  minimum_version: '', latest_version: '', minimum_build: '',
  latest_build: '', store_url: '', force_update: false,
};

const semverRegex = /^\d+\.\d+\.\d+$/;
const urlRegex = /^https:\/\/.+/;

function versionToForm(v: AppVersion): PlatformForm {
  return {
    minimum_version: v.minimum_version,
    latest_version: v.latest_version,
    minimum_build: String(v.minimum_build),
    latest_build: String(v.latest_build),
    store_url: v.store_url || '',
    force_update: v.force_update,
  };
}

export default function AppVersionsPage() {
  const { t, dir } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['app-versions'],
    queryFn: appVersionsService.getAll,
  });

  const androidVersion = versions?.find((v) => v.platform === 'android');
  const iosVersion = versions?.find((v) => v.platform === 'ios');

  const [androidOverrides, setAndroidOverrides] = useState<Partial<PlatformForm>>({});
  const [iosOverrides, setIosOverrides] = useState<Partial<PlatformForm>>({});
  const [androidErrors, setAndroidErrors] = useState<Record<string, string>>({});
  const [iosErrors, setIosErrors] = useState<Record<string, string>>({});
  const [confirmPlatform, setConfirmPlatform] = useState<'android' | 'ios' | null>(null);

  const androidForm: PlatformForm = androidVersion
    ? { ...versionToForm(androidVersion), ...androidOverrides }
    : { ...emptyForm, ...androidOverrides };

  const iosForm: PlatformForm = iosVersion
    ? { ...versionToForm(iosVersion), ...iosOverrides }
    : { ...emptyForm, ...iosOverrides };

  const saveMutation = useMutation({
    mutationFn: async ({ platform, payload }: { platform: string; payload: Partial<AppVersion> }) => {
      return await appVersionsService.updatePlatform(platform, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
      if (variables.platform === 'android') setAndroidOverrides({});
      else setIosOverrides({});
      setAndroidErrors({});
      setIosErrors({});
      showToast(t.appVersions.saveSuccess, 'success');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      console.error('[AppVersions Save Error]', message, error);
      showToast(message || t.common.error, 'error');
    },
  });

  const validate = (form: PlatformForm, setErrors: (e: Record<string, string>) => void): boolean => {
    const errs: Record<string, string> = {};
    if (!form.minimum_version.trim()) errs.minimum_version = t.appVersions.validation.versionRequired;
    else if (!semverRegex.test(form.minimum_version.trim())) errs.minimum_version = t.appVersions.validation.versionInvalid;
    if (!form.latest_version.trim()) errs.latest_version = t.appVersions.validation.versionRequired;
    else if (!semverRegex.test(form.latest_version.trim())) errs.latest_version = t.appVersions.validation.versionInvalid;
    if (!form.minimum_build.trim()) errs.minimum_build = t.appVersions.validation.buildRequired;
    else if (isNaN(Number(form.minimum_build))) errs.minimum_build = t.appVersions.validation.buildNumber;
    if (!form.latest_build.trim()) errs.latest_build = t.appVersions.validation.buildRequired;
    else if (isNaN(Number(form.latest_build))) errs.latest_build = t.appVersions.validation.buildNumber;
    if (!form.store_url.trim()) errs.store_url = t.appVersions.validation.urlRequired;
    else if (!urlRegex.test(form.store_url.trim())) errs.store_url = t.appVersions.validation.urlRequired;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (platform: 'android' | 'ios') => {
    const form = platform === 'android' ? androidForm : iosForm;
    const setErrors = platform === 'android' ? setAndroidErrors : setIosErrors;
    if (!validate(form, setErrors)) return;

    const payload: Partial<AppVersion> = {
      minimum_version: form.minimum_version.trim(),
      latest_version: form.latest_version.trim(),
      minimum_build: Number(form.minimum_build),
      latest_build: Number(form.latest_build),
      store_url: form.store_url.trim(),
      force_update: form.force_update,
    };
    saveMutation.mutate({ platform, payload });
  };

  const confirmForceUpdate = () => {
    if (!confirmPlatform) return;
    const setOverrides = confirmPlatform === 'android' ? setAndroidOverrides : setIosOverrides;
    setOverrides((prev) => ({ ...prev, force_update: !(confirmPlatform === 'android' ? androidForm : iosForm).force_update }));
    setConfirmPlatform(null);
  };

  const renderCard = (platform: 'android' | 'ios') => {
    const form = platform === 'android' ? androidForm : iosForm;
    const setOverrides = platform === 'android' ? setAndroidOverrides : setIosOverrides;
    const errors = platform === 'android' ? androidErrors : iosErrors;
    const setErrors = platform === 'android' ? setAndroidErrors : setIosErrors;
    const versionData = platform === 'android' ? androidVersion : iosVersion;

    const handleChange = (key: keyof PlatformForm, value: string | boolean) => {
      setOverrides((prev) => ({ ...prev, [key]: value }));
      if (typeof value === 'string') {
        const k = key as string;
        setErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
      }
    };

    const inputClass = (key: string) =>
      `w-full rounded-xl border px-4 py-2.5 focus:outline-none ${errors[key] ? 'border-red-500' : 'border-gray-700'} bg-gray-800 focus:border-blue-600`;

    return (
      <div className="dashboard-card rounded-xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
            <FiSmartphone size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {platform === 'android' ? t.appVersions.android : t.appVersions.ios}
            </h3>
            {versionData?.updated_at && (
              <p className="text-xs text-gray-500">
                {t.appVersions.updatedAt}: {new Date(versionData.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">{t.appVersions.minimumVersion} <span className="text-red-400">*</span></label>
              <input
                type="text" value={form.minimum_version} placeholder="1.0.0"
                onChange={(e) => handleChange('minimum_version', e.target.value)}
                className={inputClass('minimum_version')}
              />
              {errors.minimum_version && <p className="mt-1 text-xs text-red-400">{errors.minimum_version}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">{t.appVersions.latestVersion} <span className="text-red-400">*</span></label>
              <input
                type="text" value={form.latest_version} placeholder="2.0.0"
                onChange={(e) => handleChange('latest_version', e.target.value)}
                className={inputClass('latest_version')}
              />
              {errors.latest_version && <p className="mt-1 text-xs text-red-400">{errors.latest_version}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">{t.appVersions.minimumBuild} <span className="text-red-400">*</span></label>
              <input
                type="number" value={form.minimum_build} placeholder="1"
                onChange={(e) => handleChange('minimum_build', e.target.value)}
                className={inputClass('minimum_build')}
              />
              {errors.minimum_build && <p className="mt-1 text-xs text-red-400">{errors.minimum_build}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">{t.appVersions.latestBuild} <span className="text-red-400">*</span></label>
              <input
                type="number" value={form.latest_build} placeholder="2"
                onChange={(e) => handleChange('latest_build', e.target.value)}
                className={inputClass('latest_build')}
              />
              {errors.latest_build && <p className="mt-1 text-xs text-red-400">{errors.latest_build}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">{t.appVersions.storeUrl} <span className="text-red-400">*</span></label>
            <input
              type="url" value={form.store_url}
              placeholder={platform === 'android' ? 'https://play.google.com/store/apps/details?id=...' : 'https://apps.apple.com/app/id...'}
              onChange={(e) => handleChange('store_url', e.target.value)}
              dir="ltr"
              className={inputClass('store_url') + ' text-left'}
            />
            {errors.store_url && <p className="mt-1 text-xs text-red-400">{errors.store_url}</p>}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/50 px-4 py-3">
            <span className="text-sm text-gray-300">{t.appVersions.forceUpdate}</span>
            <Switch
              enabled={form.force_update}
              onChange={() => setConfirmPlatform(platform)}
              dir={dir}
              disabled={saveMutation.isPending}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => handleSave(platform)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FiSave size={16} />
            {saveMutation.isPending ? t.common.loading : t.common.save}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 dashboard-loading-spinner rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.appVersions.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderCard('android')}
        {renderCard('ios')}
      </div>

      <ConfirmDialog
        isOpen={!!confirmPlatform}
        onClose={() => setConfirmPlatform(null)}
        onConfirm={confirmForceUpdate}
        title={t.appVersions.forceUpdate}
        message={
          (confirmPlatform === 'android' ? androidForm : iosForm).force_update
            ? t.appVersions.confirmDisableForceUpdate
            : t.appVersions.confirmForceUpdate
        }
        variant="warning"
      />
    </div>
  );
}
