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

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-xl transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-white/20" />
          ) : (
            <p className="mt-2 text-3xl font-bold">{value}</p>
          )}
        </div>
        <div className="rounded-xl bg-white/15 p-3 text-2xl backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className={`absolute -bottom-4 -start-4 h-24 w-24 rounded-full bg-white/5 ${dir === 'rtl' ? '-left-4' : '-left-4'}`} />
    </div>
  );
}
