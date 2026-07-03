'use client';

import { ReactNode } from 'react';
import { useTranslation } from '@/i18n/provider';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, color = 'from-blue-600 to-blue-700', loading }: StatCardProps) {
  const { dir } = useTranslation();
  const tone = color.includes('emerald') ? 'green'
    : color.includes('amber') ? 'amber'
      : color.includes('red') ? 'red'
        : color.includes('cyan') ? 'cyan'
          : color.includes('slate') ? 'slate'
            : 'blue';
  const iconTone = {
    blue: 'dashboard-soft-icon-blue',
    green: 'dashboard-soft-icon-green',
    amber: 'dashboard-soft-icon-amber',
    red: 'dashboard-soft-icon-red',
    cyan: 'dashboard-soft-icon-cyan',
    slate: 'dashboard-soft-icon-slate',
  }[tone];
  const accentTone = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
    cyan: 'bg-cyan-600',
    slate: 'bg-slate-500',
  }[tone];

  return (
    <div className="dashboard-card group relative overflow-hidden rounded-lg p-6">
      <div className={`absolute inset-y-5 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-1 rounded-full ${accentTone}`} />
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-400">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-gray-700/50" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-normal text-white">{value}</p>
          )}
        </div>
        <div className={`dashboard-soft-icon shrink-0 ${iconTone}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
