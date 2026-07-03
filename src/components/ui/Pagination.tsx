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

  if (totalPages <= 0) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  const PrevIcon = dir === 'rtl' ? FiChevronRight : FiChevronLeft;
  const NextIcon = dir === 'rtl' ? FiChevronLeft : FiChevronRight;
  const buttonBase = 'inline-flex h-9 items-center justify-center rounded-lg border border-gray-700 px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${buttonBase} bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white`}
      >
        <PrevIcon size={16} />
        <span className="ms-1 hidden sm:inline">{t.common.previous}</span>
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={`${buttonBase} bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white`}>1</button>
          <span className="px-1 text-gray-600">...</span>
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`${buttonBase} min-w-9 ${
            page === currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          <span className="px-1 text-gray-600">...</span>
          <button onClick={() => onPageChange(totalPages)} className={`${buttonBase} bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white`}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${buttonBase} bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white`}
      >
        <span className="me-1 hidden sm:inline">{t.common.next}</span>
        <NextIcon size={16} />
      </button>
    </div>
  );
}
