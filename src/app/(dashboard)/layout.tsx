'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const superAdminOnlyPath = [
    '/notifications',
    '/countries',
    '/app-versions',
    '/banners',
    '/admins',
    '/requests',
    '/offers',
    '/favorites',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!loading && !admin) {
      router.replace('/login');
      return;
    }

    if (!loading && admin && superAdminOnlyPath && !isSuperAdmin) {
      router.replace('/');
    }
  }, [loading, admin, router, superAdminOnlyPath, isSuperAdmin]);

  if (loading || showLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-700 bg-gray-900/80 px-8 py-7 shadow-xl">
          <div className="dashboard-loading-spinner h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-600" />
          <p className="text-sm font-medium text-gray-400">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  if (superAdminOnlyPath && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-8 py-7 text-center shadow-xl">
          <h1 className="text-lg font-bold text-white">غير مصرح</h1>
          <p className="mt-2 text-sm text-gray-400">هذه الصفحة متاحة للمشرف الرئيسي فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
