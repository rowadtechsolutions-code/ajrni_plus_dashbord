'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { offersService } from '@/services/offers.service';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { BookingOffer } from '@/types';

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
};

export default function OffersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'accept' | 'reject' } | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['offers', page],
    queryFn: () => offersService.list({ page, limit, order: 'desc' }),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => offersService.updateStatus(id, 'accepted'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => offersService.updateStatus(id, 'rejected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'office', label: t.offices.officeName, render: (o: BookingOffer) => o.office?.office_name || '-' },
    { key: 'car_name', label: t.offers.carName },
    { key: 'car_model', label: t.offers.carModel },
    { key: 'price_per_day', label: t.offers.pricePerDay, render: (o: BookingOffer) => `${o.price_per_day}` },
    { key: 'total_price', label: t.offers.totalPrice, render: (o: BookingOffer) => `${o.total_price}` },
    {
      key: 'status',
      label: t.offers.status,
      render: (o: BookingOffer) => <Badge variant={statusColors[o.status]}>{t.offers[o.status as keyof typeof t.offers]}</Badge>,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t.offers.title}</h1>
        </div>

        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(offer) => {
            setSelectedOffer(offer);
            setShowModal(true);
          }}
          pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
        />

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.offers.title} size="lg">
          {selectedOffer && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-800 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-300">{t.offices.officeDetails}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">{t.offices.officeName}</label>
                    <p className="text-white">{selectedOffer.office?.office_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t.offices.phone}</label>
                    <p className="text-white">{selectedOffer.office?.phone_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t.offices.email}</label>
                    <p className="text-white">{selectedOffer.office?.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t.offices.city} / {t.offices.country}</label>
                    <p className="text-white">{[selectedOffer.office?.city, selectedOffer.office?.country].filter(Boolean).join(' / ') || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">{t.offers.carName}</label>
                  <p className="text-white">{selectedOffer.car_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t.offers.carModel}</label>
                  <p className="text-white">{selectedOffer.car_model}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t.offers.pricePerDay}</label>
                  <p className="text-white">{selectedOffer.price_per_day}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t.offers.totalPrice}</label>
                  <p className="text-white">{selectedOffer.total_price}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">{t.offers.status}</label>
                  <Badge variant={statusColors[selectedOffer.status]}>{t.offers[selectedOffer.status as keyof typeof t.offers]}</Badge>
                </div>
                {selectedOffer.notes && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">{t.offers.notes}</label>
                    <p className="text-white">{selectedOffer.notes}</p>
                  </div>
                )}
              </div>

              {selectedOffer.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                  <button onClick={() => setConfirmAction({ type: 'accept' })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    {t.offers.accepted}
                  </button>
                  <button onClick={() => setConfirmAction({ type: 'reject' })} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    {t.offers.rejected}
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>

      <ConfirmDialog
        isOpen={confirmAction?.type === 'accept'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (selectedOffer) acceptMutation.mutate(selectedOffer.id); }}
        title={t.offers.accepted}
        message={t.common.confirm}
        variant="info"
        loading={acceptMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmAction?.type === 'reject'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (selectedOffer) rejectMutation.mutate(selectedOffer.id); }}
        title={t.offers.rejected}
        message={t.common.confirm}
        variant="danger"
        loading={rejectMutation.isPending}
      />
    </>
  );
}
