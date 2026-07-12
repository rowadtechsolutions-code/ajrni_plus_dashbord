'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiAlertCircle, FiRotateCcw } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { officeBranchesService } from '@/services/office-branches.service';
import { clearBranchCache } from '@/services/branch-utils.service';
import { countriesService } from '@/services/countries.service';
import { citiesService } from '@/services/cities.service';
import { useToast } from '@/hooks/useToast';
import { OfficeBranchesStats } from './office-branches-stats';
import { OfficeBranchesFilters } from './office-branches-filters';
import type { FiltersState } from './office-branches-filters';
import { OfficeBranchesTable } from './office-branches-table';
import { OfficeBranchForm } from './office-branch-form';
import { OfficeBranchDetails } from './office-branch-details';
import { OfficeBranchDeleteDialog } from './office-branch-delete-dialog';
import type { OfficeBranch, OfficeSummary, OfficeBranchFormValues, Country, City } from '@/types';

function useDebouncedValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const LIMIT = 15;

const defaultFilters: FiltersState = {
  search: '',
  is_active: '',
  parent_office_id: '',
  country: '',
  city: '',
};

export function OfficeBranchesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const tb = t.officeBranches;

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [detailsBranch, setDetailsBranch] = useState<OfficeBranch | null>(null);
  const [editBranch, setEditBranch] = useState<OfficeBranch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<OfficeBranch | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const debouncedSearch = useDebouncedValue(filters.search, 400);

  useEffect(() => { setPage(1); }, [debouncedSearch, filters.is_active, filters.parent_office_id, filters.country, filters.city]);

  const listQuery = useQuery({
    queryKey: ['office-branches', page, debouncedSearch, filters.is_active, filters.parent_office_id, filters.country, filters.city],
    queryFn: () => officeBranchesService.list({
      page,
      limit: LIMIT,
      search: debouncedSearch || undefined,
      is_active: filters.is_active || undefined,
      parent_office_id: filters.parent_office_id || undefined,
      country: filters.country || undefined,
      city: filters.city || undefined,
    }),
  });

  const statsQuery = useQuery({
    queryKey: ['office-branches-stats'],
    queryFn: () => officeBranchesService.getStats(),
  });

  const officesQuery = useQuery({
    queryKey: ['offices-for-branch-select'],
    queryFn: () => officeBranchesService.getOfficesForBranchSelect(),
    staleTime: 60000,
  });

  const countriesQuery = useQuery({
    queryKey: ['office-branches-countries'],
    queryFn: () => countriesService.getAllActive(),
    staleTime: 60000,
  });

  const citiesQuery = useQuery({
    queryKey: ['office-branches-cities'],
    queryFn: () => citiesService.list({ limit: 10000 }),
    staleTime: 60000,
  });

  const allCountries: Country[] = countriesQuery.data || [];
  const allCities: City[] = citiesQuery.data?.data || [];

  const invalidateAll = useCallback(() => {
    clearBranchCache();
    queryClient.invalidateQueries({ queryKey: ['office-branches'] });
    queryClient.invalidateQueries({ queryKey: ['office-branches-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['offices-for-branch-select'] });
    queryClient.invalidateQueries({ queryKey: ['branch-form-countries'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data: OfficeBranchFormValues) => officeBranchesService.create(data),
    onSuccess: () => {
      invalidateAll();
      showToast(tb.addSuccess, 'success');
      setShowAddForm(false);
    },
    onError: (_err: any) => {
      // error handled in form component
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OfficeBranchFormValues> }) =>
      officeBranchesService.update(id, data),
    onSuccess: () => {
      invalidateAll();
      showToast(tb.editSuccess, 'success');
      setEditBranch(null);
    },
    onError: (_err: any) => {
      // error handled in form component
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => officeBranchesService.delete(id),
    onSuccess: () => {
      invalidateAll();
      showToast(tb.deleteSuccess, 'success');
      setDeleteBranch(null);
    },
    onError: (err: any) => {
      const msg = err?.message || '';
      const code = err?.code || '';
      if (code === '42501' || msg.includes('permission denied')) {
        showToast(tb.permissionDenied, 'error');
      } else {
        showToast(tb.unexpectedError, 'error');
      }
      setDeleteBranch(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      officeBranchesService.toggleActive(id, is_active),
    onSuccess: (data) => {
      clearBranchCache();
      invalidateAll();
      showToast(data.is_active ? tb.toggleActiveSuccess : tb.toggleInactiveSuccess, 'success');
    },
    onError: () => {
      showToast(tb.unexpectedError, 'error');
    },
  });

  const handleSave = async (data: OfficeBranchFormValues) => {
    if (editBranch) {
      await updateMutation.mutateAsync({ id: editBranch.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const resendInviteMutation = useMutation({
    mutationFn: (id: string) => officeBranchesService.resendInvite(id),
    onSuccess: () => {
      showToast('تم إرسال رابط جديد لتعيين كلمة المرور إلى بريد الفرع.', 'success');
    },
    onError: (err: any) => {
      const code = err?.code || '';
      if (code === 'rate_limited') {
        showToast('تم إرسال رابط مؤخرًا. يرجى الانتظار دقيقة قبل طلب رابط جديد.', 'info');
      } else {
        showToast('فشل إرسال رابط تعيين كلمة المرور.', 'error');
      }
    },
  });

  const handleToggle = (branch: OfficeBranch) => {
    toggleMutation.mutate({ id: branch.id, is_active: !branch.is_active });
  };

  const handleResendInvite = (branch: OfficeBranch) => {
    resendInviteMutation.mutate(branch.id);
  };

  const totalPages = Math.ceil((listQuery.data?.count || 0) / LIMIT);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{tb.title}</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <FiPlus size={18} />
          {tb.addBranch}
        </button>
      </div>

      <OfficeBranchesStats data={statsQuery.data} loading={statsQuery.isLoading} />

      <OfficeBranchesFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        offices={officesQuery.data || []}
        countries={allCountries}
        cityOptions={allCities.map((c) => ({
          id: c.id,
          country_id: c.country_id,
          value: c.name_ar,
          label: c.name_ar,
        }))}
      />

      {listQuery.error ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-center">
          <FiAlertCircle className="text-red-400" size={40} />
          <p className="text-sm text-red-400">{tb.unexpectedError}</p>
          <button
            onClick={() => listQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            <FiRotateCcw size={15} />
            {t.dashboard.retry}
          </button>
        </div>
      ) : (
        <OfficeBranchesTable
          data={listQuery.data?.data || []}
          loading={listQuery.isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onView={setDetailsBranch}
          onEdit={setEditBranch}
          onToggle={handleToggle}
          onDelete={setDeleteBranch}
          onResendInvite={handleResendInvite}
          countries={allCountries}
          cities={allCities}
        />
      )}

      <OfficeBranchForm
        isOpen={showAddForm || !!editBranch}
        onClose={() => { setShowAddForm(false); setEditBranch(null); }}
        onSave={handleSave}
        branch={editBranch}
        offices={officesQuery.data || []}
        officesLoading={officesQuery.isLoading}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <OfficeBranchDetails
        isOpen={!!detailsBranch}
        onClose={() => setDetailsBranch(null)}
        branch={detailsBranch}
        countries={allCountries}
        cities={allCities}
        onResendInvite={handleResendInvite}
      />

      <OfficeBranchDeleteDialog
        isOpen={!!deleteBranch}
        onClose={() => setDeleteBranch(null)}
        onConfirm={() => deleteMutation.mutate(deleteBranch!.id)}
        branch={deleteBranch}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
