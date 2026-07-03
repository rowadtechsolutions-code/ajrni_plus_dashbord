'use client';

import { FiUsers, FiBriefcase, FiTruck, FiCheckCircle, FiClock, FiGift, FiHeart } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardSkeleton } from '@/components/ui/Skeleton';

interface StatsData {
  totalUsers: number;
  totalOffices: number;
  totalCars: number;
  activeCars: number;
  pendingRequests: number;
  offersCount: number;
  favoritesCount: number;
}

interface StatsGridProps {
  data?: StatsData;
  loading?: boolean;
}

export function StatsGrid({ data, loading }: StatsGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const stats = [
    { title: t.dashboard.totalUsers, value: data?.totalUsers ?? 0, icon: <FiUsers />, color: 'from-blue-600 to-blue-700' },
    { title: t.dashboard.totalOffices, value: data?.totalOffices ?? 0, icon: <FiBriefcase />, color: 'from-amber-500 to-amber-600' },
    { title: t.dashboard.totalCars, value: data?.totalCars ?? 0, icon: <FiTruck />, color: 'from-emerald-600 to-emerald-700' },
    { title: t.dashboard.activeCars, value: data?.activeCars ?? 0, icon: <FiCheckCircle />, color: 'from-cyan-600 to-cyan-700' },
    { title: t.dashboard.pendingRequests, value: data?.pendingRequests ?? 0, icon: <FiClock />, color: 'from-amber-600 to-amber-700' },
    { title: t.dashboard.offersCount, value: data?.offersCount ?? 0, icon: <FiGift />, color: 'from-red-500 to-red-600' },
    { title: t.dashboard.favoritesCount, value: data?.favoritesCount ?? 0, icon: <FiHeart />, color: 'from-slate-500 to-slate-600' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
      ))}
    </div>
  );
}
