'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/i18n/provider';

interface OfficesActivityChartProps {
  data: { office_id: string; office_name: string; count: number }[];
}

const COLORS = ['#2563EB', '#F59E0B', '#22C55E', '#EF4444', '#06B6D4', '#64748B', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

export function OfficesActivityChart({ data }: OfficesActivityChartProps) {
  const { t } = useTranslation();

  const chartData = data.map((d, i) => ({
    name: d.office_name || d.office_id?.slice(0, 8) || `Office ${i + 1}`,
    value: d.count,
  }));

  return (
    <div className="dashboard-card rounded-lg p-6">
      <h3 className="mb-5 text-sm font-bold text-white">{t.dashboard.officesActivity}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
