'use client';

import { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-blue-500">
        {icon || <FiInbox className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
