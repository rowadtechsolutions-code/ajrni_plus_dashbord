'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { bannersService } from '@/services/banners.service';
import { officesService } from '@/services/offices.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Banner } from '@/types';
import { FiPlus } from 'react-icons/fi';
import { format } from 'date-fns';

const now = () => new Date().toISOString().slice(0, 16);

export default function BannersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { admin } = useAuth();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'toggle'; banner: Banner } | null>(null);
  const limit = 10;

  const [form, setForm] = useState({
    title: '',
    image_url: '',
    office_id: '',
    start_date: '',
    end_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['banners', page, search, filterActive],
    queryFn: () => bannersService.list({ page, limit, search, is_active: filterActive || undefined }),
  });

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => officesService.list({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Banner>) => bannersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      showToast(t.common.success, 'success');
      closeModal();
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banner> }) => bannersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      showToast(t.common.success, 'success');
      closeModal();
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const deleteFromStorage = async (url: string) => {
    if (!url) return;
    const parts = url.split('/public/Banners/');
    if (parts.length < 2) return;
    const path = parts[1].split('?')[0];
    await supabase.storage.from('Banners').remove([path]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (banner: Banner) => {
      await deleteFromStorage(banner.image_url);
      await bannersService.delete(banner.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      showToast(t.common.delete + ' ' + t.common.success, 'success');
      setShowModal(false);
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      bannersService.update(id, {
        is_active: isActive,
        ...(isActive ? { approved_by: admin?.id || null, approved_at: new Date().toISOString() } : { approved_by: null, approved_at: null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      showToast(t.common.success, 'success');
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = t.banners.requiredTitle;
    if (!form.office_id) errs.office_id = t.banners.requiredOffice;
    if (!form.image_url) errs.image_url = t.banners.requiredImage;
    if (!form.start_date) errs.start_date = t.banners.requiredStartDate;
    if (!form.end_date) errs.end_date = t.banners.requiredEndDate;
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      errs.end_date = t.banners.endDateAfterStart;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    setEditingBanner(null);
    setForm({ title: '', image_url: '', office_id: '', start_date: '', end_date: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      image_url: banner.image_url,
      office_id: banner.office_id,
      start_date: banner.start_date ? new Date(banner.start_date).toISOString().slice(0, 16) : '',
      end_date: banner.end_date ? new Date(banner.end_date).toISOString().slice(0, 16) : '',
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: Partial<Banner> = {
      title: form.title.trim(),
      image_url: form.image_url,
      office_id: form.office_id,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    };
    if (editingBanner) {
      if (form.image_url !== editingBanner.image_url) {
        await deleteFromStorage(editingBanner.image_url);
      }
      updateMutation.mutate({ id: editingBanner.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isExpired = (end: string) => new Date(end) < new Date();
  const isActivePeriod = (start: string, end: string) => {
    const now = new Date();
    return new Date(start) <= now && new Date(end) >= now;
  };

  const columns = [
    {
      key: 'image_url',
      label: t.banners.image,
      render: (b: Banner) =>
        b.image_url ? <img src={b.image_url} alt={b.title} className="h-12 w-20 rounded-lg object-cover" /> : '-',
    },
    { key: 'title', label: t.banners.titleField },
    {
      key: 'office',
      label: t.banners.office,
      render: (b: Banner) => b.office?.office_name || '-',
    },
    {
      key: 'start_date',
      label: t.banners.startDate,
      render: (b: Banner) => format(new Date(b.start_date), 'yyyy-MM-dd HH:mm'),
    },
    {
      key: 'end_date',
      label: t.banners.endDate,
      render: (b: Banner) => (
        <span className={isExpired(b.end_date) ? 'text-red-400' : ''}>
          {format(new Date(b.end_date), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: t.banners.isActive,
      render: (b: Banner) => {
        if (!isActivePeriod(b.start_date, b.end_date)) return <Badge variant="error">{t.banners.expired}</Badge>;
        return <Badge variant={b.is_active ? 'success' : 'error'}>{b.is_active ? t.banners.active : t.banners.inactive}</Badge>;
      },
    },
    {
      key: 'approved_by',
      label: t.banners.approvedBy,
      render: (b: Banner) => (b.approved_by ? (b.approved_by === admin?.id ? admin.full_name : b.approved_by.slice(0, 8)) : '-'),
    },
    {
      key: 'created_at',
      label: t.banners.createdAt,
      render: (b: Banner) => format(new Date(b.created_at), 'yyyy-MM-dd'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.banners.title}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <FiPlus size={18} /> {t.banners.addBanner}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="max-w-sm flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t.banners.searchPlaceholder} />
        </div>
        <select
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-600"
        >
          <option value="">{t.banners.filterAll}</option>
          <option value="true">{t.banners.filterActive}</option>
          <option value="false">{t.banners.filterInactive}</option>
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(banner) => openEdit(banner)}
        pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
      />

      <Modal isOpen={showModal} onClose={closeModal} title={editingBanner ? t.banners.editBanner : t.banners.addBanner} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.banners.titleField} *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={`w-full rounded-xl border ${errors.title ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600`}
              placeholder={t.banners.titleField}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.banners.office} *</label>
            <select
              value={form.office_id}
              onChange={(e) => setForm({ ...form, office_id: e.target.value })}
              className={`w-full rounded-xl border ${errors.office_id ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600`}
            >
              <option value="">--</option>
              {(officesData?.data || []).map((o) => (
                <option key={o.id} value={o.id}>{o.office_name}</option>
              ))}
            </select>
            {errors.office_id && <p className="mt-1 text-xs text-red-400">{errors.office_id}</p>}
          </div>

          <div>
            <ImageUpload
              bucket="Banners"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              label={`${t.banners.image} *`}
            />
            {errors.image_url && <p className="mt-1 text-xs text-red-400">{errors.image_url}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.banners.startDate} *</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={`w-full rounded-xl border ${errors.start_date ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600`}
              />
              {errors.start_date && <p className="mt-1 text-xs text-red-400">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.banners.endDate} *</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={`w-full rounded-xl border ${errors.end_date ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600`}
              />
              {errors.end_date && <p className="mt-1 text-xs text-red-400">{errors.end_date}</p>}
            </div>
          </div>

          {editingBanner && (
            <div className="rounded-lg bg-gray-800 p-4 text-sm text-gray-400">
              <p>{t.banners.approvedBy}: {editingBanner.approved_by ? (editingBanner.approved_by === admin?.id ? admin.full_name : editingBanner.approved_by) : '-'}</p>
              <p>{t.banners.approvedAt}: {editingBanner.approved_at ? format(new Date(editingBanner.approved_at), 'yyyy-MM-dd HH:mm') : '-'}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="flex gap-2">
              {editingBanner && (
                <>
                  <button onClick={() => setConfirmAction({ type: 'toggle', banner: editingBanner })}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${editingBanner.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                    {editingBanner.is_active ? t.common.deactivate : t.common.activate}
                  </button>
                  <button onClick={() => setConfirmAction({ type: 'delete', banner: editingBanner })}
                    className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                    {t.common.delete}
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors">
                {t.common.cancel}
              </button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.banner) deleteMutation.mutate(confirmAction.banner); }}
        title={t.common.delete}
        message={t.banners.confirmDelete}
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmAction?.type === 'toggle'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.banner) toggleMutation.mutate({ id: confirmAction.banner.id, isActive: !confirmAction.banner.is_active }); }}
        title={confirmAction?.banner?.is_active ? t.common.deactivate : t.common.activate}
        message={confirmAction?.banner?.is_active ? t.banners.deactivateConfirm : t.banners.activateConfirm}
        variant={confirmAction?.banner?.is_active ? 'warning' : 'info'}
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
