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
    danger: { bg: 'bg-red-600 hover:bg-red-700', icon: 'text-red-400', border: 'border-red-500/20' },
    warning: { bg: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-400', border: 'border-amber-500/20' },
    info: { bg: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-500', border: 'border-blue-600/20' },
  };

  const c = colors[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-2xl bg-gray-900 border ${c.border} shadow-2xl p-6`}>
        <button onClick={onClose} className="absolute top-4 end-4 text-gray-500 hover:text-white">
          <FiX size={18} />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${c.icon} bg-gray-800 text-2xl`}>
            <FiAlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400 mb-6">{message}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} disabled={loading} className="flex-1 rounded-xl bg-gray-800 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {cancelText || t.common.cancel}
            </button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-colors ${c.bg}`}>
              {loading ? t.common.loading : (confirmText || t.common.confirm)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
