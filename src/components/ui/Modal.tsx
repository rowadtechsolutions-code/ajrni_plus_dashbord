'use client';

import { ReactNode, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className={`relative max-h-[90vh] w-full ${sizeClasses[size]} overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl`}>
        <div className="flex items-center justify-between gap-4 border-b border-gray-700 px-5 py-4">
          <h2 className="min-w-0 truncate text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
            <FiX size={18} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
