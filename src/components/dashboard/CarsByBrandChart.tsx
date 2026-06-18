'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface CarsByBrandChartProps {
  data: { brand: string; count: number }[];
}

export function CarsByBrandChart({ data }: CarsByBrandChartProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.dashboard.carsByBrand}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="brand" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
