'use client';

import { FiShare2, FiCheckCircle, FiXCircle, FiBriefcase } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { StatCard } from '@/components/ui/StatCard';

interface StatsData {
  total: number;
  active: number;
  inactive: number;
  officesWithBranches: number;
}

interface OfficeBranchesStatsProps {
  data?: StatsData;
  loading?: boolean;
}

export function OfficeBranchesStats({ data, loading }: OfficeBranchesStatsProps) {
  const { t } = useTranslation();
  const tb = t.officeBranches;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title={tb.totalBranches}
        value={data?.total ?? 0}
        icon={<FiShare2 size={22} />}
        color="from-blue-600 to-blue-700"
        loading={loading}
      />
      <StatCard
        title={tb.activeBranches}
        value={data?.active ?? 0}
        icon={<FiCheckCircle size={22} />}
        color="from-emerald-600 to-emerald-700"
        loading={loading}
      />
      <StatCard
        title={tb.inactiveBranches}
        value={data?.inactive ?? 0}
        icon={<FiXCircle size={22} />}
        color="from-amber-600 to-amber-700"
        loading={loading}
      />
      <StatCard
        title={tb.officesWithBranches}
        value={data?.officesWithBranches ?? 0}
        icon={<FiBriefcase size={22} />}
        color="from-cyan-600 to-cyan-700"
        loading={loading}
      />
    </div>
  );
}
