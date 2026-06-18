'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { offersService } from '@/services/offers.service';
import { officesService } from '@/services/offices.service';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { BookingOffer } from '@/types';
import { FiPlus } from 'react-icons/fi';

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning', accepted: 'success', rejected: 'error',
};

export default function OffersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'accept' | 'reject' | 'create' } | null>(null);
  const limit = 10;

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => officesService.list({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['offers', page],
    queryFn: () => offersService.list({ page, limit, order: 'desc' }),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => offersService.updateStatus(id, 'accepted'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); showToast(t.common.success, 'success'); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => offersService.updateStatus(id, 'rejected'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); showToast(t.common.success, 'success'); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const [createForm, setCreateForm] = useState({
    request_id: '', office_id: '', car_name: '', car_model: '',
    price_per_day: 0, total_price: 0, notes: '',
  });

  const createMutation = useMutation({
    mutationFn: () => offersService.create(createForm),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); showToast(t.offers.createOffer + ' ' + t.common.success, 'success'); setShowCreateModal(false); setCreateForm({ request_id: '', office_id: '', car_name: '', car_model: '', price_per_day: 0, total_price: 0, notes: '' }); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
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
    <><div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.offers.title}</h1>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          <FiPlus size={18} /> {t.offers.createOffer}
        </button>
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(offer) => { setSelectedOffer(offer); setShowModal(true); }}
        pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.offers.title} size="lg">
        {selectedOffer && (
          <div className="space-y-4">
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
                <button onClick={() => setConfirmAction({ type: 'accept' })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">{t.offers.accepted}</button>
                <button onClick={() => setConfirmAction({ type: 'reject' })} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">{t.offers.rejected}</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t.offers.createOffer} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Request ID</label>
            <input type="text" value={createForm.request_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, request_id: e.target.value }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Office</label>
            <select value={createForm.office_id} onChange={(e) => setCreateForm((prev) => ({ ...prev, office_id: e.target.value }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none">
              <option value="">-- Office --</option>
              {officesData?.data?.map((off) => (
                <option key={off.id} value={off.id}>{off.office_name} ({off.country}/{off.city})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.offers.carName}</label>
              <input type="text" value={createForm.car_name} onChange={(e) => setCreateForm((prev) => ({ ...prev, car_name: e.target.value }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.offers.carModel}</label>
              <input type="text" value={createForm.car_model} onChange={(e) => setCreateForm((prev) => ({ ...prev, car_model: e.target.value }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.offers.pricePerDay}</label>
              <input type="number" value={createForm.price_per_day} onChange={(e) => setCreateForm((prev) => ({ ...prev, price_per_day: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.offers.totalPrice}</label>
              <input type="number" value={createForm.total_price} onChange={(e) => setCreateForm((prev) => ({ ...prev, total_price: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.offers.notes}</label>
            <textarea value={createForm.notes} onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setShowCreateModal(false)} className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white">{t.common.cancel}</button>
            <button onClick={() => setConfirmAction({ type: 'create' })} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              {t.common.save}
            </button>
          </div>
        </div>
      </Modal>
    </div>

    <ConfirmDialog
        isOpen={confirmAction?.type === 'create'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => createMutation.mutate()}
        title={t.offers.createOffer}
        message="هل أنت متأكد من إضافة هذا العرض؟"
        variant="info"
        loading={createMutation.isPending}
      />

    <ConfirmDialog
      isOpen={confirmAction?.type === 'accept'}
      onClose={() => setConfirmAction(null)}
      onConfirm={() => { if (selectedOffer) acceptMutation.mutate(selectedOffer.id); }}
      title={t.offers.accepted}
      message="هل أنت متأكد من قبول هذا العرض؟"
      variant="info"
      loading={acceptMutation.isPending}
    />

    <ConfirmDialog
      isOpen={confirmAction?.type === 'reject'}
      onClose={() => setConfirmAction(null)}
      onConfirm={() => { if (selectedOffer) rejectMutation.mutate(selectedOffer.id); }}
      title={t.offers.rejected}
      message="هل أنت متأكد من رفض هذا العرض؟"
      variant="danger"
      loading={rejectMutation.isPending}
    />
  </>);
}
