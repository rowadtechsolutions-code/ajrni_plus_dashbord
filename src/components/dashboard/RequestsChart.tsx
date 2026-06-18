'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface RequestsChartProps {
  data: { date: string; count: number }[];
}

export function RequestsChart({ data }: RequestsChartProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.dashboard.requestsOverTime}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
