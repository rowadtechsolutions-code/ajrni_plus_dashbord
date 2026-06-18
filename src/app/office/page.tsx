'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiHome, FiTruck } from 'react-icons/fi';
import type { Office } from '@/types';

export default function OfficeDashboardPage() {
  const [office, setOffice] = useState<Office | null>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('office_session');
    if (!raw) {
      router.push('/office/login');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setOffice(parsed.office);
    } catch {
      router.push('/office/login');
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('office_session');
    router.push('/office/login');
  };

  if (!office) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <FiTruck className="text-blue-500" size={24} />
          <span className="text-lg font-bold">Ajrni — {office.office_name}</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <FiLogOut size={16} /> تسجيل خروج
        </button>
      </header>
      <main className="p-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6 max-w-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FiHome size={20} className="text-blue-500" />
            بيانات المكتب
          </h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-400">الاسم:</span> <span className="text-white">{office.office_name}</span></div>
            <div><span className="text-gray-400">البريد:</span> <span className="text-white">{office.email}</span></div>
            <div><span className="text-gray-400">الهاتف:</span> <span className="text-white">{office.phone_number}</span></div>
            <div><span className="text-gray-400">الدولة:</span> <span className="text-white">{office.country}</span></div>
            <div><span className="text-gray-400">المدينة:</span> <span className="text-white">{office.city}</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
