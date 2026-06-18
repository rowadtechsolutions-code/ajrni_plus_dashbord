'use client';

import { FiSearch } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t.common.search}
        className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 ps-10 pe-4 text-sm text-white placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
      />
    </div>
  );
}
