'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiUsers, FiBriefcase, FiTruck, FiFileText, FiGift, FiHeart, FiSettings, FiX, FiLogOut, FiShield } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/', icon: FiGrid, labelKey: 'dashboard' },
  { href: '/users', icon: FiUsers, labelKey: 'users' },
  { href: '/offices', icon: FiBriefcase, labelKey: 'offices' },
  { href: '/cars', icon: FiTruck, labelKey: 'cars' },
  { href: '/requests', icon: FiFileText, labelKey: 'requests' },
  { href: '/offers', icon: FiGift, labelKey: 'offers' },
  { href: '/favorites', icon: FiHeart, labelKey: 'favorites' },
  { href: '/settings', icon: FiSettings, labelKey: 'settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, dir } = useTranslation();
  const { admin, signOut } = useAuth();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 z-50 h-full w-64 bg-gray-900 border-gray-800 transition-transform duration-300 lg:relative lg:translate-x-0 ${
          dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
        } ${
          isOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <FiTruck className="text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-white">Ajrni</span>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors lg:hidden">
            <FiX size={20} />
          </button>
        </div>

        {admin && (
          <div className="border-b border-gray-800 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-500 text-sm font-bold">
                {admin.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{admin.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <FiShield size={12} className={admin.role === 'super_admin' ? 'text-amber-400' : 'text-blue-500'} />
                  <span className={`text-xs ${admin.role === 'super_admin' ? 'text-amber-400' : 'text-blue-500'}`}>
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600/10 text-blue-500' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {t.nav[item.labelKey as keyof typeof t.nav]}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-colors"
          >
            <FiLogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
