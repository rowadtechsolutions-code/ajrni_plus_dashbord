'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface RequestsChartProps {
  data: { date: string; count: number }[];
}

export function RequestsChart({ data }: RequestsChartProps) {
  const { t } = useTranslation();

  return (
    <div className="dashboard-card rounded-lg p-6">
      <h3 className="mb-5 text-sm font-bold text-white">{t.dashboard.requestsOverTime}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={12} />
            <YAxis stroke="var(--text-dim)" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
