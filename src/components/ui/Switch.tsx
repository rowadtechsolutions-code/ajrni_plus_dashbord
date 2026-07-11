'use client';

interface SwitchProps {
  enabled: boolean;
  onChange: () => void;
  dir?: 'ltr' | 'rtl';
  disabled?: boolean;
}

export function Switch({ enabled, onChange, dir = 'ltr', disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? 'bg-blue-600' : 'bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          dir === 'rtl'
            ? (enabled ? '-translate-x-[1.375rem]' : '-translate-x-0.5')
            : (enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5')
        }`}
      />
    </button>
  );
}
