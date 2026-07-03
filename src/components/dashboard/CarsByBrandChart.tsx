'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface CarsByBrandChartProps {
  data: { brand: string; count: number }[];
}

export function CarsByBrandChart({ data }: CarsByBrandChartProps) {
  const { t } = useTranslation();

  return (
    <div className="dashboard-card rounded-lg p-6">
      <h3 className="mb-5 text-sm font-bold text-white">{t.dashboard.carsByBrand}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="brand" stroke="var(--text-dim)" fontSize={12} />
            <YAxis stroke="var(--text-dim)" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
