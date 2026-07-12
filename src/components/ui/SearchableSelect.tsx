'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  image?: string | null;
  badge?: { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'neutral' } | null;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function SearchableSelect({
  options, value, onChange, placeholder, searchPlaceholder,
  noResultsText, disabled, error, className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, dir } = useTranslation();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase())),
      )
    : options;

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); setTimeout(() => inputRef.current?.focus(), 50); } }}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
          error ? 'border-red-500' : 'border-gray-700'
        } bg-gray-800 text-white disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {selectedOption ? (
            <>
              {selectedOption.image && (
                <img src={selectedOption.image} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
              )}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="hidden truncate text-xs text-gray-500 sm:inline">{selectedOption.sublabel}</span>
              )}
              {selectedOption.badge && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  selectedOption.badge.variant === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-red-500/10 text-red-300'
                }`}>
                  {selectedOption.badge.label}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">{placeholder || t.common.search}</span>
          )}
        </div>
        <FiChevronDown className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
          <div className="relative border-b border-gray-700">
            <FiSearch className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder || t.common.search}
              className="w-full rounded-t-lg bg-transparent py-2.5 pe-3 ps-10 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3.5 py-6 text-center text-sm text-gray-500">
                {noResultsText || t.common.noData}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-sm transition-colors hover:bg-gray-800 ${
                    opt.value === value ? 'bg-blue-600/10 text-blue-400' : 'text-gray-300'
                  }`}
                >
                  {opt.image && (
                    <img src={opt.image} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                  )}
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="hidden shrink-0 truncate text-xs text-gray-500 sm:inline">{opt.sublabel}</span>
                  )}
                  {opt.badge && (
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      opt.badge.variant === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-red-500/10 text-red-300'
                    }`}>
                      {opt.badge.label}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
