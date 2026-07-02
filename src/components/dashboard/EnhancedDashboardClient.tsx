'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { analyticsService } from '@/services/analytics.service';
import { analyticsEnhancedService } from '@/services/analytics-enhanced.service';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';
import { FiDownload, FiRefreshCw, FiChevronUp, FiChevronDown, FiMinus, FiPrinter, FiAlertTriangle } from 'react-icons/fi';


const CHART_COLORS = {
  pending: '#F59E0B',
  accepted: '#10B981',
  rejected: '#EF4444',
  users: '#3B82F6',
  offices: '#8B5CF6',
};

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

function computeChange(current: number, previous: number): { pct: string; direction: 'up' | 'down' | 'flat' | 'na' } {
  if (previous === 0 && current === 0) return { pct: '0%', direction: 'flat' };
  if (previous === 0) return { pct: '+100%', direction: 'up' };
  const change = ((current - previous) / previous) * 100;
  const pct = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return { pct, direction };
}

function getLastUpdate(): string {
  return new Date().toLocaleString('ar-SA', { hour12: false });
}

function downloadCSV(filename: string, rows: string[][]) {
  const bom = '\uFEFF';
  const csv = bom + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SectionCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-700 bg-gray-800/50 p-5 ${className}`}>
      {title && <h3 className="mb-4 text-sm font-semibold text-gray-300">{title}</h3>}
      {children}
    </div>
  );
}

function SectionError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <FiAlertTriangle className="mb-2 h-8 w-8 text-red-400" />
      <p className="text-sm text-gray-400">{t.dashboard.failedToLoad}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          <FiRefreshCw size={12} /> {t.dashboard.retry}
        </button>
      )}
    </div>
  );
}

function SectionLoading() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function EnhancedDashboardClient() {
  const { t, dir } = useTranslation();
  const [datePreset, setDatePreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return analyticsEnhancedService.getDatePreset(datePreset);
  }, [datePreset, customFrom, customTo]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
  });

  const {
    data: periodData,
    isLoading: periodLoading,
    isError: periodError,
    refetch: refetchPeriod,
  } = useQuery({
    queryKey: ['dashboard-period', dateRange.from, dateRange.to],
    queryFn: () => analyticsEnhancedService.getPeriodData(dateRange.from, dateRange.to),
  });

  const {
    data: reviewData,
    isLoading: reviewLoading,
    isError: reviewError,
    refetch: refetchReview,
  } = useQuery({
    queryKey: ['dashboard-review'],
    queryFn: () => analyticsEnhancedService.getAllOfficesForReview(),
    staleTime: 30000,
  });

  const { data: topOffices = [] } = useQuery({
    queryKey: ['dashboard-top-offices'],
    queryFn: () => analyticsEnhancedService.getTopOffices(),
    staleTime: 30000,
  });

  const { data: geoData = [] } = useQuery({
    queryKey: ['dashboard-geo'],
    queryFn: () => analyticsEnhancedService.getGeoDistribution(),
    staleTime: 60000,
  });

  const presets = [
    { key: '7d', label: t.dashboard.filterLast7Days },
    { key: '30d', label: t.dashboard.filterLast30Days },
    { key: '90d', label: t.dashboard.filterLast90Days },
    { key: 'thisMonth', label: t.dashboard.filterThisMonth },
    { key: 'prevMonth', label: t.dashboard.filterPrevMonth },
    { key: 'thisYear', label: t.dashboard.filterThisYear },
  ];

  const reqStatusLabels: Record<string, string> = {
    pending: t.dashboard.reqStatusPending,
    accepted: t.dashboard.reqStatusAccepted,
    rejected: t.dashboard.reqStatusRejected,
  };

  const requestsActivityData = useMemo(() => {
    if (!periodData) return [];
    const dailyMap = new Map<string, { date: string; pending: number; accepted: number; rejected: number }>();
    const addReq = (req: { status: string; created_at: string }) => {
      const day = req.created_at?.split('T')[0];
      if (!day) return;
      const entry = dailyMap.get(day) || { date: day, pending: 0, accepted: 0, rejected: 0 };
      if (req.status === 'pending') entry.pending += 1;
      else if (req.status === 'accepted') entry.accepted += 1;
      else if (req.status === 'rejected') entry.rejected += 1;
      dailyMap.set(day, entry);
    };
    periodData.bookingRequests.forEach(addReq);
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [periodData]);

  const statusSummary = useMemo(() => {
    if (!periodData) return { pending: 0, accepted: 0, rejected: 0, total: 0 };
    const summary = { pending: 0, accepted: 0, rejected: 0, total: periodData.bookingRequests.length };
    periodData.bookingRequests.forEach((r) => {
      if (r.status === 'pending') summary.pending += 1;
      else if (r.status === 'accepted') summary.accepted += 1;
      else if (r.status === 'rejected') summary.rejected += 1;
    });
    return summary;
  }, [periodData]);

  const growthData = useMemo(() => {
    if (!periodData) return [];
    const dayMap = new Map<string, { date: string; users: number; offices: number }>();
    const addIfExists = (map: Map<string, { date: string; users: number; offices: number }>, day: string, type: 'users' | 'offices') => {
      const entry = map.get(day) || { date: day, users: 0, offices: 0 };
      entry[type] += 1;
      map.set(day, entry);
    };
    periodData.newUsers.forEach((u) => {
      const day = u.created_at?.split('T')[0];
      if (day) addIfExists(dayMap, day, 'users');
    });
    periodData.newOffices.forEach((o) => {
      const day = o.created_at?.split('T')[0];
      if (day) addIfExists(dayMap, day, 'offices');
    });
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [periodData]);

  const periodKPIs = useMemo(() => {
    if (!periodData) return null;
    const current = {
      newRequests: periodData.bookingRequests.length,
      newUsers: periodData.newUsers.length,
      newOffices: periodData.newOffices.length,
      newCars: periodData.newCars.length,
      accepted: periodData.bookingRequests.filter((r) => r.status === 'accepted').length,
      rejected: periodData.bookingRequests.filter((r) => r.status === 'rejected').length,
    };
    const previous = {
      newRequests: periodData.prevBookingRequests.length,
      newUsers: periodData.prevNewUsers.length,
      newOffices: periodData.prevNewOffices.length,
      newCars: periodData.prevNewCars.length,
      accepted: periodData.prevBookingRequests.filter((r) => r.status === 'accepted').length,
      rejected: periodData.prevBookingRequests.filter((r) => r.status === 'rejected').length,
    };
    const total = current.newRequests || 1;
    return {
      newRequests: { value: current.newRequests, change: computeChange(current.newRequests, previous.newRequests) },
      newUsers: { value: current.newUsers, change: computeChange(current.newUsers, previous.newUsers) },
      newOffices: { value: current.newOffices, change: computeChange(current.newOffices, previous.newOffices) },
      newCars: { value: current.newCars, change: computeChange(current.newCars, previous.newCars) },
      acceptRate: { value: `${((current.accepted / total) * 100).toFixed(1)}%`, change: null },
      rejectRate: { value: `${((current.rejected / total) * 100).toFixed(1)}%`, change: null },
    };
  }, [periodData]);

  const officesNeedingReview = useMemo(() => {
    if (!reviewData) return [];
    const inactive = reviewData.offices
      .filter((o) => !o.is_active)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 10);
    return inactive;
  }, [reviewData]);

  const pendingRequestsNeedingAttention = useMemo(() => {
    if (!periodData) return [];
    return periodData.bookingRequests
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 10);
  }, [periodData]);

  const handleDatePreset = useCallback((key: string) => {
    setDatePreset(key);
    setShowDownloadMenu(false);
  }, []);

  const generateReportData = useCallback(() => {
    if (!periodData || !stats) return null;
    return {
      stats,
      period: dateRange,
      periodData,
      statusSummary,
      periodKPIs,
      topOffices,
      reviewData,
      geoData,
    };
  }, [periodData, stats, dateRange, statusSummary, periodKPIs, topOffices, reviewData, geoData]);

  const handleDownloadCSV = useCallback(() => {
    const reportData = generateReportData();
    if (!reportData) return;

    const filename = `ajrni-plus-admin-report-${dateRange.from}-${dateRange.to}.csv`;
    const rows: string[][] = [];

    rows.push([t.dashboard.reportTitle]);
    rows.push([`${t.dashboard.reportPeriod}: ${dateRange.from} ${t.dashboard.filterTo} ${dateRange.to}`]);
    rows.push([`${t.dashboard.reportCreatedAt}: ${getLastUpdate()}`]);
    rows.push([]);

    rows.push([t.dashboard.totalUsers, String(reportData.stats.totalUsers)]);
    rows.push([t.dashboard.totalOffices, String(reportData.stats.totalOffices)]);
    rows.push([t.dashboard.totalCars, String(reportData.stats.totalCars)]);
    rows.push([t.dashboard.activeCars, String(reportData.stats.activeCars)]);
    rows.push([t.dashboard.pendingRequests, String(reportData.stats.pendingRequests)]);
    rows.push([t.dashboard.offersCount, String(reportData.stats.offersCount)]);
    rows.push([t.dashboard.favoritesCount, String(reportData.stats.favoritesCount)]);
    rows.push([]);

    if (reportData.periodKPIs) {
      rows.push([t.dashboard.periodNewRequests, String(reportData.periodKPIs.newRequests.value), reportData.periodKPIs.newRequests.change.pct]);
      rows.push([t.dashboard.periodNewUsers, String(reportData.periodKPIs.newUsers.value), reportData.periodKPIs.newUsers.change.pct]);
      rows.push([t.dashboard.periodNewOffices, String(reportData.periodKPIs.newOffices.value), reportData.periodKPIs.newOffices.change.pct]);
      rows.push([t.dashboard.periodNewCars, String(reportData.periodKPIs.newCars.value), reportData.periodKPIs.newCars.change.pct]);
      rows.push([t.dashboard.periodAcceptRate, reportData.periodKPIs.acceptRate.value]);
      rows.push([t.dashboard.periodRejectRate, reportData.periodKPIs.rejectRate.value]);
      rows.push([]);
    }

    rows.push([t.dashboard.reqStatusSummary]);
    rows.push([t.dashboard.reqStatusPending, String(reportData.statusSummary.pending)]);
    rows.push([t.dashboard.reqStatusAccepted, String(reportData.statusSummary.accepted)]);
    rows.push([t.dashboard.reqStatusRejected, String(reportData.statusSummary.rejected)]);
    const total = reportData.statusSummary.total || 1;
    rows.push([t.dashboard.periodAcceptRate, `${((reportData.statusSummary.accepted / total) * 100).toFixed(1)}%`]);
    rows.push([t.dashboard.periodRejectRate, `${((reportData.statusSummary.rejected / total) * 100).toFixed(1)}%`]);
    rows.push([]);

    if (reportData.reviewData) {
      rows.push([t.dashboard.officesNeedReview]);
      const needingReview = reportData.reviewData.offices
        .filter((o: { is_active: boolean }) => !o.is_active)
        .sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 10);
      if (needingReview.length === 0) {
        rows.push([t.dashboard.noDataEnough]);
      } else {
        for (const office of needingReview) {
          const hasDuplicate = reportData.reviewData.duplicateGroups &&
            Array.from(reportData.reviewData.duplicateGroups.values()).some(
              (g: { id: string }[]) => g.some((o: { id: string }) => o.id === office.id)
            );
          rows.push([
            office.office_name || t.offices.officeWithoutName,
            office.phone_number || t.offices.phoneNotAvailable,
            office.country || office.city || '',
            office.created_at?.split('T')[0] || '',
            t.common.inactive,
            hasDuplicate ? t.offices.duplicateReg : '',
          ]);
        }
      }
      rows.push([]);
    }

    rows.push([t.dashboard.pendingOrders]);
    const pendingReqs = reportData.periodData.bookingRequests
      .filter((r: { status: string }) => r.status === 'pending')
      .sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 10);
    if (pendingReqs.length === 0) {
      rows.push([t.dashboard.noDataEnough]);
    } else {
      for (const req of pendingReqs) {
        const waitDays = daysBetween(req.created_at?.split('T')[0] || dateRange.from, dateRange.to);
        rows.push([
          req.id.slice(0, 8) + '...',
          t.dashboard.reqStatusPending,
          req.created_at?.split('T')[0] || '',
          `${waitDays} ${t.dashboard.days}`,
        ]);
      }
    }
    rows.push([]);

    rows.push([t.dashboard.topOffices]);
    rows.push([t.dashboard.topOfficesBy]);
    if (reportData.topOffices.length === 0) {
      rows.push([t.dashboard.noDataEnough]);
    } else {
      for (const office of reportData.topOffices.slice(0, 10)) {
        rows.push([office.office_name, String(office.offerCount)]);
      }
    }
    rows.push([]);

    rows.push([t.dashboard.geoDistribution]);
    if (reportData.geoData.length === 0) {
      rows.push([t.dashboard.noDataEnough]);
    } else {
      for (const g of reportData.geoData.slice(0, 10)) {
        rows.push([g.country, `${t.dashboard.geoUsers}: ${g.userCount}`, `${t.dashboard.geoOffices}: ${g.officeCount}`]);
      }
    }

    downloadCSV(filename, rows);
  }, [generateReportData, dateRange, t]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' },
    labelStyle: { color: '#F3F4F6' },
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Last Update */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">{t.dashboard.title}</h1>
        <span className="text-xs text-gray-500">{t.dashboard.lastUpdate}: {getLastUpdate()}</span>
      </div>

      {/* Existing Stats Grid - unchanged */}
      <StatsGrid data={stats} loading={statsLoading} />

      {/* Date Range Filter + Download */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handleDatePreset(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                datePreset === p.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-gray-300" />
              <span className="text-gray-500">{t.dashboard.filterTo}</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-gray-300" />
            </div>
          )}
          {datePreset !== 'custom' && (
            <button onClick={() => setDatePreset('custom')}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {t.dashboard.filterCustom}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <FiDownload size={14} /> {t.dashboard.downloadReport}
            </button>
            {showDownloadMenu && (
              <div className={`absolute top-full mt-1 z-10 w-40 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
                <button onClick={() => { handleDownloadCSV(); setShowDownloadMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <FiDownload size={12} /> {t.dashboard.downloadCSV}
                </button>
                <button onClick={() => { handlePrint(); setShowDownloadMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <FiPrinter size={12} /> {t.dashboard.downloadPrint}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period KPI Cards */}
      {periodKPIs && !periodLoading && !periodError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {[
            { label: t.dashboard.periodNewRequests, value: periodKPIs.newRequests.value, change: periodKPIs.newRequests.change },
            { label: t.dashboard.periodNewUsers, value: periodKPIs.newUsers.value, change: periodKPIs.newUsers.change },
            { label: t.dashboard.periodNewOffices, value: periodKPIs.newOffices.value, change: periodKPIs.newOffices.change },
            { label: t.dashboard.periodNewCars, value: periodKPIs.newCars.value, change: periodKPIs.newCars.change },
            { label: t.dashboard.periodAcceptRate, value: periodKPIs.acceptRate.value, change: null },
            { label: t.dashboard.periodRejectRate, value: periodKPIs.rejectRate.value, change: null },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-700 bg-gray-800/30 p-3">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{kpi.value}</p>
              {kpi.change && kpi.change.direction !== 'na' && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium mt-0.5 ${
                  kpi.change.direction === 'up' ? 'text-emerald-400' : kpi.change.direction === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {kpi.change.direction === 'up' ? <FiChevronUp size={10} /> : kpi.change.direction === 'down' ? <FiChevronDown size={10} /> : <FiMinus size={10} />}
                  {kpi.change.pct}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Requests Activity Chart */}
      <SectionCard title={t.dashboard.reqActivity}>
        {periodLoading ? <SectionLoading /> : periodError ? <SectionError onRetry={() => refetchPeriod()} /> : requestsActivityData.length === 0 ? (
          <EmptyState title={t.dashboard.noPeriodData} icon={<FiMinus className="h-12 w-12" />} />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={requestsActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip {...chartTooltipStyle} />
                <Legend formatter={(value) => <span style={{ color: '#D1D5DB' }}>{reqStatusLabels[value] || value}</span>} />
                <Line type="monotone" dataKey="pending" stroke={CHART_COLORS.pending} strokeWidth={2} dot={false} name="pending" />
                <Line type="monotone" dataKey="accepted" stroke={CHART_COLORS.accepted} strokeWidth={2} dot={false} name="accepted" />
                <Line type="monotone" dataKey="rejected" stroke={CHART_COLORS.rejected} strokeWidth={2} dot={false} name="rejected" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* Status Summary + Growth Chart - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Summary */}
        <SectionCard title={t.dashboard.reqStatusSummary}>
          {periodLoading ? <SectionLoading /> : periodError ? <SectionError onRetry={() => refetchPeriod()} /> : statusSummary.total === 0 ? (
            <EmptyState title={t.dashboard.noPeriodData} />
          ) : (
            <div className="space-y-4">
              {[
                { key: 'pending', label: t.dashboard.reqStatusPending, count: statusSummary.pending, color: 'bg-amber-500' },
                { key: 'accepted', label: t.dashboard.reqStatusAccepted, count: statusSummary.accepted, color: 'bg-emerald-500' },
                { key: 'rejected', label: t.dashboard.reqStatusRejected, count: statusSummary.rejected, color: 'bg-red-500' },
              ].map((s) => {
                const pct = statusSummary.total > 0 ? ((s.count / statusSummary.total) * 100).toFixed(1) : '0';
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{s.label}</span>
                      <span className="text-sm font-medium text-white">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{((statusSummary.accepted / (statusSummary.total || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-gray-500">{t.dashboard.periodAcceptRate}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{((statusSummary.rejected / (statusSummary.total || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-gray-500">{t.dashboard.periodRejectRate}</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Growth Chart */}
        <SectionCard title={t.dashboard.sectionGrowth}>
          {periodLoading ? <SectionLoading /> : periodError ? <SectionError onRetry={() => refetchPeriod()} /> : growthData.length === 0 ? (
            <EmptyState title={t.dashboard.noDataEnough} />
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">{t.dashboard.periodNewUsers}</p>
                  <p className="text-lg font-bold text-white">{periodData?.newUsers.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t.dashboard.periodNewOffices}</p>
                  <p className="text-lg font-bold text-white">{periodData?.newOffices.length || 0}</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
                    <Tooltip {...chartTooltipStyle} />
                    <Legend formatter={(value) => <span style={{ color: '#D1D5DB' }}>{value === 'users' ? t.dashboard.periodNewUsers : t.dashboard.periodNewOffices}</span>} />
                    <Bar dataKey="users" fill={CHART_COLORS.users} radius={[3, 3, 0, 0]} name="users" />
                    <Bar dataKey="offices" fill={CHART_COLORS.offices} radius={[3, 3, 0, 0]} name="offices" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Offices Review + Pending Requests - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Offices Needing Review */}
        <SectionCard title={t.dashboard.officesNeedReview}>
          {reviewLoading ? <SectionLoading /> : reviewError ? <SectionError onRetry={() => refetchReview()} /> : officesNeedingReview.length === 0 ? (
            <EmptyState title={t.dashboard.noDataEnough} />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {officesNeedingReview.map((office) => (
                <div key={office.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800/20 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{office.office_name || t.offices.officeWithoutName}</p>
                    <p className="text-xs text-gray-500">{office.country || office.city || ''} {office.phone_number ? `| ${office.phone_number}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="warning">{t.common.inactive}</Badge>
                    <Link href={`/offices/${office.id}/edit`}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                    >
                      {t.dashboard.viewOffice}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Pending Requests Needing Attention */}
        <SectionCard title={t.dashboard.pendingOrders}>
          {periodLoading ? <SectionLoading /> : periodError ? <SectionError onRetry={() => refetchPeriod()} /> : pendingRequestsNeedingAttention.length === 0 ? (
            <EmptyState title={t.dashboard.noDataEnough} />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pendingRequestsNeedingAttention.map((req) => {
                const waitDays = daysBetween(req.created_at?.split('T')[0] || dateRange.from, dateRange.to);
                return (
                  <div key={req.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800/20 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate font-mono text-xs">{req.id.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-500">
                        {t.dashboard.waitingSince} {req.created_at?.split('T')[0]} ({waitDays} {t.dashboard.days})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="warning">{t.dashboard.reqStatusPending}</Badge>
                      <Link href={`/requests/${req.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                      >
                        {t.common.view}
                      </Link>
                    </div>
                  </div>
                );
              })}
              <Link href="/requests" className="block text-center text-xs text-blue-400 hover:text-blue-300 pt-2 transition-colors">
                {t.dashboard.viewAllRequests}
              </Link>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Top Offices + Geo Distribution - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Offices */}
        <SectionCard title={t.dashboard.topOffices}>
          {topOffices.length === 0 ? (
            <EmptyState title={t.dashboard.noDataEnough} />
          ) : (
            <>
              <p className="mb-3 text-[10px] text-gray-500">{t.dashboard.topOfficesBy}</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {topOffices.slice(0, 10).map((office, idx) => (
                  <div key={office.office_id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800/20 p-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-500 w-5 shrink-0">#{idx + 1}</span>
                      <p className="text-sm font-medium text-white truncate">{office.office_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="info">{office.offerCount}</Badge>
                      <Link href={`/offices/${office.office_id}/edit`}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                      >
                        {t.dashboard.viewOffice}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* Geographic Distribution */}
        <SectionCard title={t.dashboard.geoDistribution}>
          {geoData.length === 0 ? (
            <EmptyState title={t.dashboard.noDataEnough} />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {geoData.slice(0, 10).map((g) => {
                const maxVal = Math.max(...geoData.slice(0, 10).map((x) => x.userCount + x.officeCount), 1);
                const total = g.userCount + g.officeCount;
                const pct = (total / maxVal) * 100;
                return (
                  <div key={g.country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{g.country}</span>
                      <span className="text-xs text-gray-500">
                        {t.dashboard.geoUsers}: {g.userCount} | {t.dashboard.geoOffices}: {g.officeCount}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .sidebar, .header, .no-print { display: none !important; }
          [role="button"], button, .no-print { display: none !important; }
          div, section, main { break-inside: avoid !important; }
          table, tr, td, th { break-inside: avoid !important; page-break-inside: avoid !important; }
          [class*="bg-gray-900"], [class*="bg-gray-800"], [class*="bg-gray-700"], [class*="bg-gray-850"] { background: white !important; }
          [class*="text-white"] { color: #111 !important; }
          [class*="text-gray-300"], [class*="text-gray-400"], [class*="text-gray-500"] { color: #333 !important; }
          [class*="border-gray-700"], [class*="border-gray-600"] { border-color: #ddd !important; }
          h1, h2, h3, h4 { color: #111 !important; }
          .recharts-wrapper, .recharts-surface { background: transparent !important; }
          .recharts-text { fill: #333 !important; }
          @page { margin: 1.5cm; }
          * { box-shadow: none !important; text-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
