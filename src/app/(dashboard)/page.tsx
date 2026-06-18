'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { RequestsChart } from '@/components/dashboard/RequestsChart';
import { CarsByBrandChart } from '@/components/dashboard/CarsByBrandChart';
import { OfficesActivityChart } from '@/components/dashboard/OfficesActivityChart';
import { analyticsService } from '@/services/analytics.service';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['requests-over-time'],
    queryFn: analyticsService.getRequestsOverTime,
  });

  const { data: carsByBrand } = useQuery({
    queryKey: ['cars-by-brand'],
    queryFn: analyticsService.getCarsByBrand,
  });

  const { data: officesActivity } = useQuery({
    queryKey: ['offices-activity'],
    queryFn: analyticsService.getOfficesActivity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t.dashboard.title}</h1>
      </div>

      <StatsGrid data={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RequestsChart data={requestsData || []} />
        <CarsByBrandChart data={carsByBrand || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <OfficesActivityChart data={officesActivity || []} />
      </div>
    </div>
  );
}
