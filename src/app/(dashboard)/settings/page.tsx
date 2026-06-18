'use client';

import { useTranslation } from '@/i18n/provider';
import { FiMoon, FiGlobe } from 'react-icons/fi';

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    html.classList.toggle('dark', !isDark);
    html.classList.toggle('light', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">{t.settings.title}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t.settings.language}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setLocale('ar')}
            className={`flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
              locale === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <FiGlobe size={18} />
            {t.settings.arabic}
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
              locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <FiGlobe size={18} />
            {t.settings.english}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t.settings.theme}</h2>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-xl bg-gray-800 px-6 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <FiMoon size={18} />
          {t.settings.darkMode}
        </button>
      </div>
    </div>
  );
}
