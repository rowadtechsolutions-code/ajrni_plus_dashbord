'use client';

import { FiExternalLink } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { OfficeBranch, Country, City } from '@/types';

interface OfficeBranchDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  branch: OfficeBranch | null;
  countries: Country[];
  cities: City[];
  onResendInvite?: (branch: OfficeBranch) => void;
}

function resolveCountryName(code: string | null, countries: Country[], locale: string): string {
  if (!code) return '—';
  const country = countries.find((c) => c.code === code);
  if (!country) return code;
  const name = locale === 'ar' ? country.name_ar : country.name_en;
  return country.flag_emoji ? `${country.flag_emoji} ${name}` : name;
}

function resolveCityName(name: string | null, cities: City[], locale: string): string {
  if (!name) return '—';
  const city = cities.find((c) => c.name_ar === name);
  if (!city) return name;
  return locale === 'ar' ? city.name_ar : city.name_en;
}

export function OfficeBranchDetails({ isOpen, onClose, branch, countries, cities, onResendInvite }: OfficeBranchDetailsProps) {
  const { t, locale } = useTranslation();
  const tb = t.officeBranches;

  if (!branch) return null;

  const createdDate = new Date(branch.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tb.branchDetails} size="lg">
      <div className="space-y-5">
        {branch.linked_office?.image || branch.linked_office?.cover ? (
          <div className="grid grid-cols-2 gap-3">
            {branch.linked_office?.image && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">{tb.image}</p>
                <img src={branch.linked_office.image} alt="" className="h-36 w-full rounded-lg border border-gray-700 object-cover" />
              </div>
            )}
            {branch.linked_office?.cover && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">{tb.cover}</p>
                <img src={branch.linked_office.cover} alt="" className="h-36 w-full rounded-lg border border-gray-700 object-cover" />
              </div>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label={tb.branchName} value={branch.branch_name} />
          <DetailField
            label={t.common.status}
            value={
              <Badge variant={branch.is_active ? 'success' : 'error'}>
                {branch.is_active ? t.common.active : t.common.inactive}
              </Badge>
            }
          />
          <DetailField
            label={tb.parentOffice}
            value={
              <div className="flex items-center gap-2">
                <span>{branch.parent_office?.office_name || '—'}</span>
                {branch.parent_office?.commercial_registration_number && (
                  <span className="text-xs text-gray-500">
                    ({branch.parent_office.commercial_registration_number})
                  </span>
                )}
              </div>
            }
          />
          <DetailField
            label={tb.commercialReg}
            value={branch.parent_office?.commercial_registration_number || '—'}
          />
          <DetailField
            label={tb.country}
            value={resolveCountryName(branch.country, countries, locale)}
          />
          <DetailField
            label={tb.city}
            value={resolveCityName(branch.city, cities, locale)}
          />
          <DetailField label={tb.phone} value={branch.phone_number || '—'} />
          <DetailField label={tb.email} value={branch.email || '—'} />
          <div className="col-span-2">
            <DetailField label={tb.bio} value={branch.linked_office?.bio || '—'} />
          </div>
          <DetailField label={tb.createdAt} value={createdDate} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {branch.parent_office && (
            <a
              href={`/offices/${branch.parent_office_id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-600/30 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-600/20"
            >
              <FiExternalLink size={16} />
              {tb.viewParentOffice}
            </a>
          )}
          {onResendInvite && (
            <button
              onClick={() => onResendInvite(branch)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-600/20"
            >
              إرسال رابط تعيين كلمة مرور جديد
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
