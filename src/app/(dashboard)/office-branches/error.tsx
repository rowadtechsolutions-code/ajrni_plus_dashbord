'use client';

import { FiAlertTriangle, FiRotateCcw } from 'react-icons/fi';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-5 rounded-lg border border-red-500/30 bg-red-500/10 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
        <FiAlertTriangle className="text-red-400" size={32} />
      </div>
      <div>
        <h2 className="mb-2 text-lg font-bold text-white">حدث خطأ غير متوقع</h2>
        <p className="text-sm text-gray-400">
          {error.message || 'تعذر تحميل الصفحة. حاول مرة أخرى.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        <FiRotateCcw size={16} />
        إعادة المحاولة
      </button>
    </div>
  );
}
