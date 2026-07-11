'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiBell, FiBriefcase, FiFileText, FiGift, FiGlobe, FiGrid, FiHeart, FiImage, FiLogOut, FiSettings, FiSmartphone, FiTruck, FiUsers, FiX } from 'react-icons/fi';
import { useTranslation } from '@/i18n/provider';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  { href: '/countries', icon: FiGlobe, labelKey: 'countries' },
  { href: '/app-versions', icon: FiSmartphone, labelKey: 'appVersions' },
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`sidebar fixed top-0 z-50 flex h-full w-72 flex-col border-gray-800 bg-gray-900/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none ${
          dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
        } ${
          isOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-800 px-5">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-500/20 bg-white shadow-sm ring-4 ring-blue-600/10">
              <Image
                src="/ajrni-favicon.png"
                alt="Ajrni"
                width={44}
                height={44}
                priority
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">أجرني بلس</p>
              <p className="truncate text-xs text-gray-400">{admin?.full_name || admin?.email || 'Admin'}</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg border border-gray-700 bg-gray-800 p-1.5 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-white/15 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-blue-600/10 group-hover:text-blue-500'
                }`}>
                  <Icon size={18} />
                </span>
                <span className="truncate">{t.nav[item.labelKey as keyof typeof t.nav]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3.5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-red-500/20 hover:bg-red-600/10 hover:text-red-400"
          >
            <FiLogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={signOut}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج من لوحة التحكم؟"
        confirmText="تسجيل الخروج"
        cancelText="إلغاء"
        variant="danger"
      />
    </>
  );
}
