'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t, dir } = useTranslation();

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  const PrevIcon = dir === 'rtl' ? FiChevronRight : FiChevronLeft;
  const NextIcon = dir === 'rtl' ? FiChevronLeft : FiChevronRight;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <PrevIcon size={16} />
        {t.common.previous}
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">1</button>
          <span className="text-gray-600">...</span>
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            page === currentPage ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          <span className="text-gray-600">...</span>
          <button onClick={() => onPageChange(totalPages)} className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t.common.next}
        <NextIcon size={16} />
      </button>
    </div>
  );
}
