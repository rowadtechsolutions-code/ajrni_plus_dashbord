'use client';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const colors = {
    success: {
      pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    warning: {
      pill: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    },
    error: {
      pill: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
    },
    info: {
      pill: 'border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-600',
    },
    neutral: {
      pill: 'border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300',
      dot: 'bg-slate-400',
    },
  };
  const color = colors[variant];

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${color.pill}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}
