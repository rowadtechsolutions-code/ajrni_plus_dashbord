'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiUsers, FiBriefcase, FiTruck, FiFileText, FiGift, FiHeart, FiImage, FiBell, FiSettings, FiX, FiLogOut } from 'react-icons/fi';
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
  { href: '/banners', icon: FiImage, labelKey: 'banners' },
  { href: '/notifications', icon: FiBell, labelKey: 'notifications' },
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
        <div className="flex h-20 items-center justify-between border-b border-gray-800 px-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-500/25 bg-white shadow-lg shadow-blue-950/20 ring-2 ring-blue-500/10">
              <Image
                src="/ajrni-favicon.png"
                alt="Ajrni"
                width={48}
                height={48}
                priority
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{admin?.full_name || 'Admin'}</p>
              <p className="truncate text-xs text-gray-400">{admin?.email || 'admin'}</p>
            </div>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors lg:hidden">
            <FiX size={20} />
          </button>
        </div>

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
