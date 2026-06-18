'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { bookingService } from '@/services/booking.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { BookingRequest } from '@/types';
import { format } from 'date-fns';

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
};

export default function RequestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'accept' | 'reject' } | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['requests', page, search],
    queryFn: () => bookingService.listRequests({ page, limit, search }),
  });

  const { data: offices } = useQuery({
    queryKey: ['request-offices', selectedRequest?.id],
    queryFn: () => bookingService.listRequestOffices(selectedRequest!.id),
    enabled: !!selectedRequest?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingService.updateRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      showToast(t.common.success, 'success');
      setShowModal(false);
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'full_name', label: t.requests.fullName },
    { key: 'car_type', label: t.requests.carType },
    { key: 'brand', label: t.requests.brand },
    { key: 'model', label: t.requests.model },
    {
      key: 'pickup_date',
      label: t.requests.pickupDate,
      render: (r: BookingRequest) => r.pickup_date ? format(new Date(r.pickup_date), 'yyyy-MM-dd') : '-',
    },
    {
      key: 'return_date',
      label: t.requests.returnDate,
      render: (r: BookingRequest) => r.return_date ? format(new Date(r.return_date), 'yyyy-MM-dd') : '-',
    },
    {
      key: 'status',
      label: t.requests.status,
      render: (r: BookingRequest) => <Badge variant={statusColors[r.status]}>{t.requests[r.status as keyof typeof t.requests]}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.requests.title}</h1>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t.requests.searchPlaceholder} />
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setShowModal(true); }}
        pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.requests.requestDetails} size="xl">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t.requests.fullName}</label>
                <p className="text-white">{selectedRequest.full_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.phone}</label>
                <p className="text-white">{selectedRequest.phone_number}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.country}</label>
                <p className="text-white">{selectedRequest.country}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.city}</label>
                <p className="text-white">{selectedRequest.city}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.carType}</label>
                <p className="text-white">{selectedRequest.car_type}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.brand}</label>
                <p className="text-white">{selectedRequest.brand}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.model}</label>
                <p className="text-white">{selectedRequest.model}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.pickupDate}</label>
                <p className="text-white">{selectedRequest.pickup_date ? format(new Date(selectedRequest.pickup_date), 'yyyy-MM-dd') : '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.returnDate}</label>
                <p className="text-white">{selectedRequest.return_date ? format(new Date(selectedRequest.return_date), 'yyyy-MM-dd') : '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.requests.budgetPerDay}</label>
                <p className="text-white">{selectedRequest.budget_per_day}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">{t.requests.status}</label>
                <Badge variant={statusColors[selectedRequest.status]}>{t.requests[selectedRequest.status as keyof typeof t.requests]}</Badge>
              </div>
              {selectedRequest.notes && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">{t.requests.notes}</label>
                  <p className="text-white">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            {offices && offices.length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">{t.requests.assignedOffices}</h4>
                <div className="space-y-2">
                  {offices.map((off) => (
                    <div key={off.id} className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                      <span className="text-sm text-gray-300">{off.office_id}</span>
                      <Badge variant={off.is_read ? 'success' : 'warning'}>{off.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              {selectedRequest.status === 'pending' && (
                <>
                  <button onClick={() => setConfirmAction({ type: 'accept' })}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    {t.requests.accepted}
                  </button>
                  <button onClick={() => setConfirmAction({ type: 'reject' })}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    {t.requests.rejected}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction?.type === 'accept'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (selectedRequest) updateStatusMutation.mutate({ id: selectedRequest.id, status: 'accepted' }); }}
        title={t.requests.accepted}
        message="هل أنت متأكد من قبول هذا الطلب؟"
        variant="info"
        loading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmAction?.type === 'reject'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (selectedRequest) updateStatusMutation.mutate({ id: selectedRequest.id, status: 'rejected' }); }}
        title={t.requests.rejected}
        message="هل أنت متأكد من رفض هذا الطلب؟"
        variant="danger"
        loading={updateStatusMutation.isPending}
      />
    </div>
  );
}
