'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { carsService } from '@/services/cars.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { Car } from '@/types';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { brands } from '@/lib/brands';

const statusMap: Record<string, 'success' | 'warning' | 'error'> = {
  available: 'success',
  rented: 'warning',
  maintenance: 'error',
};

export default function CarsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'toggle'; car: Car } | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['cars', page, search],
    queryFn: () => carsService.list({ page, limit, search }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => carsService.toggleActive(id, isActive),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cars'] }); showToast(t.common.success, 'success'); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => carsService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cars'] }); showToast(t.common.delete + ' ' + t.common.success, 'success'); setShowModal(false); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'name', label: t.cars.name },
    {
      key: 'brand',
      label: t.cars.brand,
      render: (c: Car) => {
        const b = brands.find(x => x.id.toLowerCase() === c.brand?.toLowerCase());
        return (
          <span className="flex items-center gap-2 text-white">
            {b ? <img src={b.logo} alt={c.brand} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${b.label}&background=${b.color.slice(1)}&color=fff&size=20`; }} /> : null}
            {c.brand}
          </span>
        );
      },
    },
    { key: 'model', label: t.cars.model },
    { key: 'year', label: t.cars.year },
    { key: 'plate_number', label: t.cars.plateNumber },
    { key: 'price', label: t.cars.price },
    {
      key: 'office_id',
      label: t.cars.office,
      render: (c: Car) => <span className="text-white">{c.office?.office_name || '-'}</span>,
    },
    {
      key: 'status',
      label: t.cars.status,
      render: (c: Car) => <Badge variant={statusMap[c.status] || 'neutral'}>{t.cars[c.status as keyof typeof t.cars] || c.status}</Badge>,
    },
    {
      key: 'is_active',
      label: t.common.status,
      render: (c: Car) => <Badge variant={c.is_active ? 'success' : 'error'}>{c.is_active ? t.common.active : t.common.inactive}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.cars.title}</h1>
        <Link href="/cars/new" className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <FiPlus size={18} /> {t.cars.addCar}
        </Link>
      </div>
      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t.cars.searchPlaceholder} />
      </div>
      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(car) => { setSelectedCar(car); setShowModal(true); }}
        pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.cars.carDetails} size="lg">
        {selectedCar && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t.cars.name}</label>
                <p className="text-white">{selectedCar.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.brand}</label>
                <p className="flex items-center gap-2 text-white">
                  {(() => { const b = brands.find(x => x.id.toLowerCase() === selectedCar.brand?.toLowerCase()); return b ? <img src={b.logo} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${b.label}&background=${b.color.slice(1)}&color=fff&size=20`; }} /> : null; })()}
                  {selectedCar.brand}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.model}</label>
                <p className="text-white">{selectedCar.model}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.year}</label>
                <p className="text-white">{selectedCar.year}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.color}</label>
                <p className="text-white">{selectedCar.color}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.fuelType}</label>
                <p className="text-white">{selectedCar.fuel_type}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.transmission}</label>
                <p className="text-white">{selectedCar.transmission}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.seats}</label>
                <p className="text-white">{selectedCar.seats}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.plateNumber}</label>
                <p className="text-white">{selectedCar.plate_number}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.price}</label>
                <p className="text-white">{selectedCar.price}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.status}</label>
                <Badge variant={statusMap[selectedCar.status] || 'neutral'}>{t.cars[selectedCar.status as keyof typeof t.cars] || selectedCar.status}</Badge>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.cars.office}</label>
                <p className="text-white">{selectedCar.office?.office_name || '-'}</p>
              </div>
            </div>
            {selectedCar.image && (
              <div>
                <label className="text-xs text-gray-500">{t.cars.image}</label>
                <img src={selectedCar.image} alt={selectedCar.name} className="mt-1 h-40 rounded-xl object-cover" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Link href={`/cars/${selectedCar.id}/edit`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                {t.common.edit}
              </Link>
              <button onClick={() => setConfirmAction({ type: 'toggle', car: selectedCar })}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${selectedCar.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {selectedCar.is_active ? t.common.deactivate : t.common.activate}
              </button>
              <button onClick={() => setConfirmAction({ type: 'delete', car: selectedCar })} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                {t.common.delete}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.car) deleteMutation.mutate(confirmAction.car.id); }}
        title={t.common.delete}
        message={`هل أنت متأكد من حذف السيارة "${confirmAction?.car?.name}"؟`}
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmAction?.type === 'toggle'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.car) toggleMutation.mutate({ id: confirmAction.car.id, isActive: !confirmAction.car.is_active }); }}
        title={confirmAction?.car?.is_active ? t.common.deactivate : t.common.activate}
        message={confirmAction?.car?.is_active ? `هل أنت متأكد من تعطيل السيارة "${confirmAction?.car?.name}"؟` : `هل أنت متأكد من تفعيل السيارة "${confirmAction?.car?.name}"؟`}
        variant="warning"
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
