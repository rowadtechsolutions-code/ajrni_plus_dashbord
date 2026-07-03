'use client';

import { useState } from 'react';
import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';
import { Pagination } from './Pagination';
import type { TableColumn } from '@/types';

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading,
  sortable,
  onSort,
  pagination,
  onRowClick,
  emptyTitle,
  emptyDescription,
}: TableProps<T>) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!sortable) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm">
        <TableSkeleton rows={6} cols={Math.max(columns.length, 4)} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 shadow-sm">
        <EmptyState title={emptyTitle || t.common.noData} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`px-4 py-3.5 text-start text-xs font-bold text-gray-400 ${
                      col.sortable !== false && sortable ? 'cursor-pointer select-none hover:text-gray-200' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {col.label}
                      {sortable && col.sortable !== false && sortKey === col.key && (
                        sortDir === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-colors hover:bg-gray-800/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="max-w-[280px] whitespace-nowrap px-4 py-4 align-middle text-gray-300">
                      {col.render ? col.render(item) : <span className="block truncate">{item[col.key] ?? '-'}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
