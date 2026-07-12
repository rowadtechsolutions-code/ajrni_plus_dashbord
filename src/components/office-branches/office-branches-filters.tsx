'use client';

import { useMemo } from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { SearchInput } from '@/components/ui/SearchInput';
import type { OfficeSummary, Country } from '@/types';

interface FiltersState {
  search: string;
  is_active: string;
  parent_office_id: string;
  country: string;
  city: string;
}

export interface CityFilterOption {
  id: string;
  country_id: string;
  value: string;
  label: string;
}

interface OfficeBranchesFiltersProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onReset: () => void;
  offices: OfficeSummary[];
  countries: Country[];
  cityOptions: CityFilterOption[];
}

export function OfficeBranchesFilters({
  filters, onChange, onReset, offices, countries, cityOptions,
}: OfficeBranchesFiltersProps) {
  const { t, locale } = useTranslation();
  const tb = t.officeBranches;

  const update = (key: keyof FiltersState, value: string) => {
    if (key === 'country' && value !== filters.country) {
      onChange({ ...filters, country: value, city: '' });
    } else {
      onChange({ ...filters, [key]: value });
    }
  };

  const filteredCities = useMemo(() => {
    let result = cityOptions;

    if (filters.country) {
      const selectedCountry = countries.find((c) => c.code === filters.country);
      if (selectedCountry) {
        result = result.filter((city) => city.country_id === selectedCountry.id);
      }
    }

    const seen = new Set<string>();
    return result.filter((city) => {
      const key = city.value.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [cityOptions, filters.country, countries]);

  const hasFilters = filters.is_active || filters.parent_office_id || filters.country || filters.city;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SearchInput
          value={filters.search}
          onChange={(v) => update('search', v)}
          placeholder={tb.searchPlaceholder}
        />

        <select
          value={filters.is_active}
          onChange={(e) => update('is_active', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm font-medium text-white transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">{tb.allStatuses}</option>
          <option value="true">{t.common.active}</option>
          <option value="false">{t.common.inactive}</option>
        </select>

        <select
          value={filters.parent_office_id}
          onChange={(e) => update('parent_office_id', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm font-medium text-white transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">{tb.allOffices}</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.office_name || 'مكتب بدون اسم'} — {o.city || 'بدون مدينة'}
            </option>
          ))}
        </select>

        <select
          value={filters.country}
          onChange={(e) => update('country', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm font-medium text-white transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">{tb.allCountries}</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag_emoji} {locale === 'ar' ? c.name_ar : c.name_en}
            </option>
          ))}
        </select>

        <select
          value={filters.city}
          onChange={(e) => update('city', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm font-medium text-white transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">{tb.allCities}</option>
          {filteredCities.map((city) => (
            <option key={city.id} value={city.value}>
              {city.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <FiRotateCcw size={15} />
            {tb.reset}
          </button>
        </div>
      )}
    </div>
  );
}

export type { FiltersState };
