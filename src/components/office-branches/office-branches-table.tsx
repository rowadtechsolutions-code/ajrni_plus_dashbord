'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiEye, FiEdit2, FiToggleLeft, FiToggleRight, FiTrash2, FiSend, FiMoreVertical } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import type { OfficeBranch, TableColumn, Country, City } from '@/types';

function resolveCountryName(code: string | null, countries: Country[], locale: string): string {
  if (!code) return '—';
  const country = countries.find((c) => c.code === code);
  if (!country) return code;
  const name = locale === 'ar' ? country.name_ar : country.name_en;
  return country.flag_emoji ? `${country.flag_emoji} ${name}` : name;
}

function resolveCityName(name: string | null, cities: City[], locale: string): string {
  if (!name) return '—';
  const city = cities.find((c) => c.name_ar === name);
  if (!city) return name;
  return locale === 'ar' ? city.name_ar : city.name_en;
}

interface OfficeBranchesTableProps {
  data: OfficeBranch[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (branch: OfficeBranch) => void;
  onEdit: (branch: OfficeBranch) => void;
  onToggle: (branch: OfficeBranch) => void;
  onDelete: (branch: OfficeBranch) => void;
  onResendInvite?: (branch: OfficeBranch) => void;
  countries: Country[];
  cities: City[];
}

export function OfficeBranchesTable({
  data, loading, page, totalPages, onPageChange, onView, onEdit, onToggle, onDelete, onResendInvite,
  countries, cities,
}: OfficeBranchesTableProps) {
  const { t, locale } = useTranslation();
  const tb = t.officeBranches;

  const [openBranchId, setOpenBranchId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => { setMounted(true); }, []);

  const closeMenu = useCallback(() => {
    setOpenBranchId(null);
    setMenuPosition(null);
  }, []);

  useEffect(() => {
    if (!openBranchId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRefs.current[openBranchId]?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openBranchId, closeMenu]);

  const handleActionsClick = (event: React.MouseEvent<HTMLButtonElement>, branchId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    if (openBranchId === branchId) {
      closeMenu();
    } else {
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(4, rect.right - 192),
      });
      setOpenBranchId(branchId);
    }
  };

  const columns: TableColumn<OfficeBranch>[] = [
    {
      key: 'branch_name',
      label: tb.branchName,
      render: (branch) => (
        <div className="flex items-center gap-2.5">
          {branch.linked_office?.image ? (
            <img src={branch.linked_office.image} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-gray-700 object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-500">
              {branch.branch_name?.charAt(0) || '?'}
            </div>
          )}
          <span className="max-w-[160px] truncate font-medium text-white">{branch.branch_name}</span>
        </div>
      ),
    },
    {
      key: 'parent_office',
      label: tb.parentOffice,
      render: (branch) => (
        <span className="max-w-[220px] truncate">{branch.parent_office?.office_name || '—'}</span>
      ),
    },
    {
      key: 'country',
      label: tb.country,
      render: (branch) => resolveCountryName(branch.country, countries, locale),
    },
    {
      key: 'city',
      label: tb.city,
      render: (branch) => resolveCityName(branch.city, cities, locale),
    },
    {
      key: 'phone_number',
      label: tb.phone,
      render: (branch) => <span dir="ltr">{branch.phone_number || '—'}</span>,
    },
    {
      key: 'email',
      label: tb.email,
      render: (branch) => (
        <span className="max-w-[200px] truncate">{branch.email || '—'}</span>
      ),
    },
    {
      key: 'is_active',
      label: t.common.status,
      render: (branch) => (
        <Badge variant={branch.is_active ? 'success' : 'error'}>
          {branch.is_active ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: tb.createdAt,
      render: (branch) => {
        const d = new Date(branch.created_at);
        return <span className="text-xs">{d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>;
      },
    },
    {
      key: 'actions',
      label: tb.actions,
      sortable: false,
      render: (branch) => {
        const isOpen = openBranchId === branch.id;
        return (
          <>
            <button
              ref={(el) => { triggerRefs.current[branch.id] = el; }}
              onClick={(e) => handleActionsClick(e, branch.id)}
              className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <FiMoreVertical size={16} />
            </button>
            {mounted && isOpen && menuPosition && createPortal(
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: 'fixed',
                  top: menuPosition.top,
                  left: menuPosition.left,
                  zIndex: 99999,
                }}
                className="w-48 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { closeMenu(); onView(branch); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <FiEye size={16} /> {t.common.view}
                </button>
                <button
                  onClick={() => { closeMenu(); onEdit(branch); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <FiEdit2 size={16} /> {t.common.edit}
                </button>
                <button
                  onClick={() => { closeMenu(); onToggle(branch); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  {branch.is_active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                  {branch.is_active ? t.common.deactivate : t.common.activate}
                </button>
                {onResendInvite && (
                  <button
                    onClick={() => { closeMenu(); onResendInvite(branch); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                  >
                    <FiSend size={16} /> إرسال رابط تعيين كلمة مرور جديد
                  </button>
                )}
                <hr className="border-gray-700/50" />
                <button
                  onClick={() => { closeMenu(); onDelete(branch); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/10"
                >
                  <FiTrash2 size={16} /> {t.common.delete}
                </button>
              </div>,
              document.body,
            )}
          </>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      pagination={{ currentPage: page, totalPages, onPageChange }}
      emptyTitle={tb.noBranches}
      emptyDescription={tb.noBranchesDescription}
    />
  );
}
