'use client';

import { FiChevronLeft, FiChevronRight, FiGlobe, FiMenu, FiMoon } from 'react-icons/fi';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/provider';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t, locale, dir, toggleLocale } = useTranslation();
  const pathname = usePathname();
  const navKeyBySegment: Record<string, keyof typeof t.nav> = {
    users: 'users',
    offices: 'offices',
    cars: 'cars',
    requests: 'requests',
    offers: 'offers',
    favorites: 'favorites',
    banners: 'banners',
    notifications: 'notifications',
    settings: 'settings',
  };
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const pageKey = firstSegment ? navKeyBySegment[firstSegment] : 'dashboard';
  const pageLabel = pageKey ? t.nav[pageKey] : t.nav.dashboard;
  const CrumbIcon = dir === 'rtl' ? FiChevronLeft : FiChevronRight;

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    html.classList.toggle('dark', !isDark);
    html.classList.toggle('light', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  return (
    <header className="header flex min-h-16 items-center justify-between border-b border-gray-800 bg-gray-950/85 px-4 backdrop-blur-xl lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-gray-300 shadow-sm transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <FiMenu size={22} />
      </button>

      <div className="hidden min-w-0 lg:block">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <span>{t.nav.dashboard}</span>
          {pageLabel !== t.nav.dashboard && (
            <>
              <CrumbIcon size={14} />
              <span className="text-gray-300">{pageLabel}</span>
            </>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-white">أجرني بلس</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-gray-300 shadow-sm transition-colors hover:bg-gray-800 hover:text-white"
          title={t.settings.darkMode}
          aria-label={t.settings.darkMode}
        >
          <FiMoon size={18} />
        </button>

        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm transition-colors hover:bg-gray-800 hover:text-white"
        >
          <FiGlobe size={16} />
          {locale === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>
    </header>
  );
}
