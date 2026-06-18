'use client';

import { FiMenu, FiMoon, FiGlobe } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t, locale, toggleLocale } = useTranslation();

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    html.classList.toggle('dark', !isDark);
    html.classList.toggle('light', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 lg:px-6 backdrop-blur-md">
      <button
        onClick={onMenuClick}
        className="rounded-xl p-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors lg:hidden"
      >
        <FiMenu size={22} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-xl p-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          title={t.settings.darkMode}
        >
          <FiMoon size={18} />
        </button>

        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <FiGlobe size={16} />
          {locale === 'ar' ? 'EN' : 'عربى'}
        </button>
      </div>
    </header>
  );
}
