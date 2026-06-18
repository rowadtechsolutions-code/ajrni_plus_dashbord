'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface OfficesActivityChartProps {
  data: { office_id: string; count: number }[];
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export function OfficesActivityChart({ data }: OfficesActivityChartProps) {
  const { t } = useTranslation();

  const chartData = data.map((d, i) => ({
    name: d.office_id?.slice(0, 8) || `Office ${i + 1}`,
    value: d.count,
  }));

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.dashboard.officesActivity}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
