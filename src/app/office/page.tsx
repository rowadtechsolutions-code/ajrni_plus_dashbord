'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiEdit2, FiX, FiSave, FiTruck, FiShare2, FiHome } from 'react-icons/fi';
import { supabase } from '@/lib/supabase/client';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { Office, OfficeBranch } from '@/types';

interface SessionData {
  accountType: 'office' | 'branch';
  office?: Office;
  branch?: {
    branchId: string;
    parentOfficeId: string;
    linkedOfficeId: string;
    authUserId: string;
    branchName: string;
    email: string | null;
    phone_number: string | null;
    country: string | null;
    city: string | null;
    is_active: boolean;
    bio: string | null;
    image: string | null;
    cover: string | null;
  };
  access_token: string;
}

interface FormData {
  office_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
  bio: string;
  image: string;
  cover: string;
}

export default function OfficeDashboardPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('office_session');
    if (!raw) { router.push('/office/login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.accountType) {
        parsed.accountType = 'office';
      }
      setSession(parsed);
    } catch { router.push('/office/login'); }
    setLoading(false);
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('office_session');
    router.push('/office/login');
  };

  if (loading) return null;
  if (!session) return null;

  const isBranch = session.accountType === 'branch';
  const branchInfo = isBranch ? session.branch : null;
  const officeData = session.office;

  const displayName = isBranch ? (branchInfo?.branchName || '') : (officeData?.office_name || '');
  const displayEmail = isBranch ? (branchInfo?.email || '') : (officeData?.email || '');
  const displayPhone = isBranch ? (branchInfo?.phone_number || '') : (officeData?.phone_number || '');
  const displayCountry = isBranch ? (branchInfo?.country || '') : (officeData?.country || '');
  const displayCity = isBranch ? (branchInfo?.city || '') : (officeData?.city || '');
  const displayBio = isBranch ? (branchInfo?.bio || '') : (officeData?.bio || '');
  const displayImage = isBranch ? (branchInfo?.image || '') : (officeData?.image || '');
  const displayCover = isBranch ? (branchInfo?.cover || '') : (officeData?.cover || '');

  const currentForm = form ?? {
    office_name: displayName,
    email: displayEmail,
    phone_number: displayPhone,
    country: displayCountry,
    city: displayCity,
    bio: displayBio,
    image: displayImage,
    cover: displayCover,
  };

  const handleChange = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...(prev || currentForm), [key]: value }));
  };

  const startEditing = () => {
    setForm(null);
    setError('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(null);
    setError('');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!session) return;
    setError('');
    setSaving(true);

    try {
      if (isBranch) {
        const res = await fetch('/api/office-branch/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            branch_name: currentForm.office_name.trim(),
            phone_number: currentForm.phone_number.trim(),
            country: currentForm.country,
            city: currentForm.city,
            bio: currentForm.bio.trim(),
            image: currentForm.image,
            cover: currentForm.cover,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          setError(result.error || 'فشل حفظ التعديلات');
          setSaving(false);
          return;
        }

        const stored = JSON.parse(localStorage.getItem('office_session') || '{}');
        if (stored.branch) {
          stored.branch.branchName = currentForm.office_name.trim();
          stored.branch.phone_number = currentForm.phone_number.trim();
          stored.branch.country = currentForm.country;
          stored.branch.city = currentForm.city;
          stored.branch.bio = currentForm.bio.trim();
          stored.branch.image = currentForm.image;
          stored.branch.cover = currentForm.cover;
        }
        if (stored.office) {
          stored.office.office_name = currentForm.office_name.trim();
          stored.office.phone_number = currentForm.phone_number.trim();
          stored.office.country = currentForm.country;
          stored.office.city = currentForm.city;
          stored.office.bio = currentForm.bio.trim();
          stored.office.image = currentForm.image;
          stored.office.cover = currentForm.cover;
        }
        localStorage.setItem('office_session', JSON.stringify(stored));
        setSession(stored);
      } else {
        if (!officeData?.id) { setError('بيانات المكتب غير متوفرة'); setSaving(false); return; }
        const res = await fetch(`/api/auth/office-update`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: officeData.id,
            office_name: currentForm.office_name.trim(),
            email: currentForm.email.trim().toLowerCase(),
            phone_number: currentForm.phone_number.trim(),
            country: currentForm.country,
            city: currentForm.city,
            bio: currentForm.bio.trim(),
            image: currentForm.image,
            cover: currentForm.cover,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          setError(result.error || 'فشل حفظ التعديلات');
          setSaving(false);
          return;
        }

        const stored = JSON.parse(localStorage.getItem('office_session') || '{}');
        if (stored.office) {
          stored.office = result.office || stored.office;
        }
        localStorage.setItem('office_session', JSON.stringify(stored));
        setSession(stored);
      }

      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال');
    }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2">
            {isBranch ? (
              <FiShare2 className="text-blue-500" size={24} />
            ) : (
              <FiTruck className="text-blue-500" size={24} />
            )}
            <span className="text-lg font-bold">تعديل البيانات</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEditing}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={16} /> إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FiSave size={16} /> {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">اسم المكتب {!isBranch && <span className="text-red-400">*</span>}</label>
                  <input type="text" value={currentForm.office_name} onChange={(e) => handleChange('office_name', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">البريد الإلكتروني</label>
                  {isBranch ? (
                    <div>
                      <input type="email" value={currentForm.email} readOnly className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-gray-500 cursor-not-allowed" />
                      <p className="mt-1 text-xs text-gray-500">لتغيير بريد تسجيل الدخول، تواصل مع إدارة المنصة.</p>
                    </div>
                  ) : (
                    <input type="email" value={currentForm.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">الهاتف</label>
                  <input type="text" value={currentForm.phone_number} onChange={(e) => handleChange('phone_number', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">الدولة</label>
                  <input type="text" value={currentForm.country} onChange={(e) => handleChange('country', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">المدينة</label>
                  <input type="text" value={currentForm.city} onChange={(e) => handleChange('city', e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">النبذة</label>
                  <textarea value={currentForm.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-blue-600 focus:outline-none" />
                </div>
                <div>
                  <ImageUpload value={currentForm.image} onChange={(url) => handleChange('image', url)} label="الصورة" folder={`offices/${session.office?.id || 'branch'}`} />
                </div>
                <div>
                  <ImageUpload value={currentForm.cover} onChange={(url) => handleChange('cover', url)} label="الغلاف" folder={`offices/${session.office?.id || 'branch'}`} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          {isBranch ? (
            <FiShare2 className="text-blue-500" size={24} />
          ) : (
            <FiTruck className="text-blue-500" size={24} />
          )}
          <span className="text-lg font-bold">
            Ajrni — {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startEditing}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <FiEdit2 size={16} /> تعديل
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <FiLogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </header>
      <main className="p-6">
        <div className="max-w-lg space-y-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              {isBranch ? (
                <FiShare2 size={20} className="text-blue-500" />
              ) : (
                <FiHome size={20} className="text-blue-500" />
              )}
              {isBranch ? 'بيانات الفرع' : 'بيانات مكتب التأجير'}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">الاسم: </span>
                <span className="text-white">{displayName}</span>
              </div>
              <div>
                <span className="text-gray-400">البريد: </span>
                <span className="text-white">{displayEmail || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400">الهاتف: </span>
                <span className="text-white">{displayPhone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400">الدولة: </span>
                <span className="text-white">{displayCountry || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400">المدينة: </span>
                <span className="text-white">{displayCity || '—'}</span>
              </div>
              {!isBranch && officeData?.commercial_registration_number && (
                <div>
                  <span className="text-gray-400">السجل التجاري: </span>
                  <span className="text-white font-mono" dir="ltr">{officeData.commercial_registration_number}</span>
                </div>
              )}
              {displayBio && (
                <div>
                  <span className="text-gray-400">النبذة: </span>
                  <span className="text-white">{displayBio}</span>
                </div>
              )}
              {displayImage && (
                <div>
                  <span className="text-gray-400">الصورة: </span>
                  <img src={displayImage} alt="" className="mt-1 h-24 w-36 rounded-lg border border-gray-700 object-cover" />
                </div>
              )}
              {displayCover && (
                <div>
                  <span className="text-gray-400">الغلاف: </span>
                  <img src={displayCover} alt="" className="mt-1 h-24 w-36 rounded-lg border border-gray-700 object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
