'use client';

import { useState } from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
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

  if (loading) return <TableSkeleton />;

  if (!data.length) {
    return <EmptyState title={emptyTitle || t.common.noData} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-400 ${
                    col.sortable !== false && sortable ? 'cursor-pointer select-none hover:text-gray-200' : ''
                  }`}
                >
                  <span className="flex items-center gap-1">
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
                className={`transition-colors hover:bg-gray-800/30 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-gray-300">
                    {col.render ? col.render(item) : item[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
