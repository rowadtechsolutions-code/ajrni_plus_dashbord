'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { usersService } from '@/services/users.service';
import { Table } from '@/components/ui/Table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types';
import { format } from 'date-fns';

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersService.list({ page, limit, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(t.common.delete + ' ' + t.common.success, 'success');
      setShowModal(false);
    },
    onError: () => showToast(t.common.error, 'error'),
  });

  const columns = [
    { key: 'full_name', label: t.users.fullName },
    { key: 'email', label: t.users.email },
    { key: 'phone_number', label: t.users.phone },
    { key: 'country', label: t.users.country },
    { key: 'city', label: t.users.city },
    {
      key: 'created_at',
      label: t.users.createdAt,
      render: (u: User) => u.created_at ? format(new Date(u.created_at), 'yyyy-MM-dd') : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.users.title}</h1>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t.users.searchPlaceholder} />
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={(user) => { setSelectedUser(user); setShowModal(true); }}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((data?.count || 0) / limit),
          onPageChange: setPage,
        }}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t.users.userDetails} size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t.users.fullName}</label>
                <p className="text-white">{selectedUser.full_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.users.email}</label>
                <p className="text-white">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.users.phone}</label>
                <p className="text-white">{selectedUser.phone_number}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.users.country}</label>
                <p className="text-white">{selectedUser.country}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.users.city}</label>
                <p className="text-white">{selectedUser.city}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.users.createdAt}</label>
                <p className="text-white">{selectedUser.created_at ? format(new Date(selectedUser.created_at), 'yyyy-MM-dd HH:mm') : '-'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { if (selectedUser) deleteMutation.mutate(selectedUser.id); }}
        title={t.common.delete}
        message={`هل أنت متأكد من حذف المستخدم "${selectedUser?.full_name}"؟`}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
