'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { officesService, normalizeCommercialReg } from '@/services/offices.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { Office, DuplicateOfficeInfo } from '@/types';
import Link from 'next/link';
import { FiPlus, FiExternalLink } from 'react-icons/fi';

export default function OfficesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'toggle'; office: Office } | null>(null);
  const [duplicateGroup, setDuplicateGroup] = useState<{ offices: DuplicateOfficeInfo[]; regNumber: string; currentOfficeId: string } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['offices', page, search],
    queryFn: () => officesService.list({ page, limit, search }),
  });

  const { data: allOfficesData } = useQuery({
    queryKey: ['offices-duplicate-check'],
    queryFn: () => officesService.getAllForDuplicateCheck(),
    staleTime: 30000,
  });

  const duplicateMap = useMemo(() => {
    const map = new Map<string, DuplicateOfficeInfo[]>();
    if (!allOfficesData) return map;
    for (const office of allOfficesData) {
      const normalized = normalizeCommercialReg(office.commercial_registration_number);
      if (!normalized) continue;
      const group = map.get(normalized) || [];
      group.push(office);
      map.set(normalized, group);
    }
    for (const [key, offices] of map.entries()) {
      if (offices.length < 2) map.delete(key);
    }
    return map;
  }, [allOfficesData]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => officesService.toggleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['offices-duplicate-check'] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => officesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['offices-duplicate-check'] });
      showToast(t.common.delete + ' ' + t.common.success, 'success');
      setShowModal(false);
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'office_name', label: t.offices.officeName },
    { key: 'email', label: t.offices.email },
    { key: 'phone_number', label: t.offices.phone },
    { key: 'country', label: t.offices.country },
    { key: 'city', label: t.offices.city },
    {
      key: 'is_active',
      label: t.common.status,
      render: (o: Office) => (
        <Badge variant={o.is_active ? 'success' : 'error'}>
          {o.is_active ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    {
      key: '_duplicate',
      label: '',
      render: (o: Office) => {
        const normalized = normalizeCommercialReg(o.commercial_registration_number);
        const group = normalized ? duplicateMap.get(normalized) : undefined;
        if (!group) return null;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setDuplicateGroup({ offices: group, regNumber: o.commercial_registration_number, currentOfficeId: o.id }); setShowDuplicateModal(true); }}
            title={t.offices.duplicateTooltip}
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            {t.offices.duplicateReg}
            <span className="opacity-80">
              {group.length === 2 ? t.offices.duplicateCountDual : `${group.length} ${t.offices.duplicateCountPlural}`}
            </span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.offices.title}</h1>
        <Link
          href="/offices/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <FiPlus size={18} />
          {t.offices.addOffice}
        </Link>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t.offices.searchPlaceholder} />
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(office) => { setSelectedOffice(office); setShowModal(true); }}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((data?.count || 0) / limit),
          onPageChange: setPage,
        }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.offices.officeDetails} size="lg">
        {selectedOffice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t.offices.officeName}</label>
                <p className="text-white">{selectedOffice.office_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.common.status}</label>
                <Badge variant={selectedOffice.is_active ? 'success' : 'error'}>
                  {selectedOffice.is_active ? t.common.active : t.common.inactive}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.offices.email}</label>
                <p className="text-white">{selectedOffice.email}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.offices.phone}</label>
                <p className="text-white">{selectedOffice.phone_number}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.offices.country}</label>
                <p className="text-white">{selectedOffice.country}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.offices.city}</label>
                <p className="text-white">{selectedOffice.city}</p>
              </div>
              {selectedOffice.bio && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">{t.offices.bio}</label>
                  <p className="text-white">{selectedOffice.bio}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Link
                href={`/offices/${selectedOffice.id}/edit`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                {t.common.edit}
              </Link>
              <button
                onClick={() => setConfirmAction({ type: 'toggle', office: selectedOffice })}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  selectedOffice.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedOffice.is_active ? t.common.deactivate : t.common.activate}
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'delete', office: selectedOffice })}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} title={t.offices.duplicateModalTitle} size="lg">
        {duplicateGroup && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-800/50 p-3">
              <label className="text-xs text-gray-500">{t.offices.commercialReg}</label>
              <p className="text-sm font-medium text-white font-mono" dir="ltr">{duplicateGroup.regNumber}</p>
            </div>
            <div className="space-y-3">
              {duplicateGroup.offices.map((office) => (
                <div key={office.id} className="rounded-lg border border-gray-700 bg-gray-800/30 p-4 transition-colors hover:bg-gray-800/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {office.office_name || t.offices.officeWithoutName}
                      </p>
                      {office.phone_number ? (
                        <a href={`tel:${office.phone_number}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors" dir="ltr">
                          {office.phone_number}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{t.offices.phoneNotAvailable}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={office.is_active ? 'success' : 'error'}>
                        {office.is_active ? t.common.active : t.common.inactive}
                      </Badge>
                      {office.id === duplicateGroup.currentOfficeId && (
                        <Badge variant="info">{t.offices.currentOffice}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      href={`/offices/${office.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t.offices.openDetails}
                      <FiExternalLink size={12} />
                    </Link>
                    {office.phone_number && (
                      <a
                        href={`tel:${office.phone_number}`}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {t.common.view}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.office) deleteMutation.mutate(confirmAction.office.id); }}
        title={t.common.delete}
        message={`هل أنت متأكد من حذف المكتب "${confirmAction?.office?.office_name}"؟`}
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmAction?.type === 'toggle'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.office) toggleMutation.mutate({ id: confirmAction.office.id, isActive: !confirmAction.office.is_active }); }}
        title={confirmAction?.office?.is_active ? t.common.deactivate : t.common.activate}
        message={confirmAction?.office?.is_active ? `هل أنت متأكد من تعطيل المكتب "${confirmAction?.office?.office_name}"؟` : `هل أنت متأكد من تفعيل المكتب "${confirmAction?.office?.office_name}"؟`}
        variant="warning"
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
