'use client';

import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmText, cancelText, variant = 'danger', loading,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const colors = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700',
      icon: 'text-red-500 bg-red-500/10 border-red-500/20',
      border: 'border-red-500/25',
    },
    warning: {
      button: 'bg-amber-600 hover:bg-amber-700',
      icon: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      border: 'border-amber-500/25',
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-500 bg-blue-600/10 border-blue-600/20',
      border: 'border-blue-600/25',
    },
  };

  const c = colors[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div className={`relative w-full max-w-sm rounded-lg border ${c.border} bg-gray-900 p-6 shadow-2xl`}>
        <button onClick={onClose} className="absolute end-4 top-4 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white">
          <FiX size={18} />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${c.icon}`}>
            <FiAlertTriangle size={26} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
          <p className="mb-6 text-sm leading-6 text-gray-400">{message}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <button onClick={onClose} disabled={loading} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50">
              {cancelText || t.common.cancel}
            </button>
            <button onClick={onConfirm} disabled={loading} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${c.button}`}>
              {loading ? t.common.loading : (confirmText || t.common.confirm)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
