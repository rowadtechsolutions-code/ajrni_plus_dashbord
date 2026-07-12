'use client';

import { Suspense } from "react";
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { FiLock, FiEye, FiEyeOff, FiTruck } from 'react-icons/fi';
import Link from 'next/link';

type PageState = 'checking' | 'expired' | 'user_deleted' | 'session_stale' | 'ready' | 'saving' | 'done';

function UpdatePasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-600" />
        <p className="text-sm text-gray-400">جارٍ التحقق من الرابط...</p>
      </div>
    </div>
  );
}
function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<PageState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const init = async () => {
      // ---- 1. Check query errors ----
      const errorParam = searchParams.get('error');
      const errorCodeParam = searchParams.get('error_code');

      if (errorCodeParam === 'otp_expired' || errorParam === 'access_denied') {
        setPageState('expired');
        return;
      }

      // ---- 2. Check hash errors ----
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashErrorCode = hashParams.get('error_code');
      const hashError = hashParams.get('error');

      if (hashErrorCode === 'otp_expired' || hashError === 'access_denied') {
        setPageState('expired');
        return;
      }

      // ---- 3. Check for PKCE code in query ----
      const code = searchParams.get('code');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data?.session) {
          setPageState('expired');
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
        if (userError || !userData?.user) {
          await supabase.auth.signOut({ scope: 'local' });
          if (userError?.message?.includes('User from sub claim')) {
            setPageState('user_deleted');
          } else {
            setPageState('session_stale');
          }
          return;
        }

        setPageState('ready');
        return;
      }

      // ---- 4. Check for implicit flow tokens in hash ----
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken && type === 'recovery') {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data?.session) {
          setPageState('expired');
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
        if (userError || !userData?.user) {
          await supabase.auth.signOut({ scope: 'local' });
          if (userError?.message?.includes('User from sub claim')) {
            setPageState('user_deleted');
          } else {
            setPageState('session_stale');
          }
          return;
        }

        setPageState('ready');
        return;
      }

      // ---- 5. Fallback: try existing session ----
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        const unsubscribe = supabase.auth.onAuthStateChange(async (_event, s) => {
          if (s?.user) {
            unsubscribe.data.subscription.unsubscribe();
            const { data: userData, error: userError } = await supabase.auth.getUser(s.access_token);
            if (userError || !userData?.user) {
              await supabase.auth.signOut({ scope: 'local' });
              if (userError?.message?.includes('User from sub claim')) {
                setPageState('user_deleted');
              } else {
                setPageState('session_stale');
              }
              return;
            }
            setPageState('ready');
          }
        });

        setTimeout(() => {
          unsubscribe.data.subscription.unsubscribe();
          setPageState('expired');
        }, 10000);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
      if (userError || !userData?.user) {
        await supabase.auth.signOut({ scope: 'local' });
        if (userError?.message?.includes('User from sub claim')) {
          setPageState('user_deleted');
        } else {
          setPageState('session_stale');
        }
        return;
      }

      setPageState('ready');
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!password || password.length < 6) {
      setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('كلمة المرور غير متطابقة.');
      return;
    }

    setPageState('saving');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || 'حدث خطأ أثناء تعيين كلمة المرور.');
      setPageState('ready');
      return;
    }

    await supabase.auth.signOut({ scope: 'local' });
    setPageState('done');
  };

  if (pageState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-600" />
          <p className="text-sm text-gray-400">جارٍ التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600/20 shadow-lg shadow-amber-600/10">
              <FiLock className="text-amber-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">رابط الدعوة غير صالح</h1>
            <p className="mt-2 text-sm text-gray-400">
              رابط الدعوة غير صالح أو انتهت صلاحيته.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              اطلب من إدارة المنصة إرسال رابط جديد لتعيين كلمة المرور.
            </p>
          </div>
          <Link
            href="/office/login"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === 'user_deleted') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 shadow-lg shadow-red-600/10">
              <FiLock className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">حساب الدخول غير موجود</h1>
            <p className="mt-2 text-sm text-gray-400">
              حساب الدخول المرتبط بهذا الرابط لم يعد موجودًا.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              اطلب من الإدارة إرسال رابط جديد أو إعادة إنشاء حساب الفرع.
            </p>
          </div>
          <Link
            href="/office/login"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === 'session_stale') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 shadow-lg shadow-red-600/10">
              <FiLock className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">جلسة الرابط غير صالحة</h1>
            <p className="mt-2 text-sm text-gray-400">
              جلسة الرابط غير صالحة أو مرتبطة بحساب لم يعد موجودًا.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              اطلب رابطًا جديدًا من إدارة المنصة.
            </p>
          </div>
          <Link
            href="/office/login"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/20 shadow-lg shadow-emerald-600/10">
              <FiLock className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">تم تعيين كلمة المرور بنجاح</h1>
            <p className="mt-2 text-sm text-gray-400">
              يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور الجديدة.
            </p>
          </div>
          <Link
            href="/office/login"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
            <FiTruck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">تعيين كلمة مرور الفرع</h1>
          <p className="mt-1 text-sm text-gray-500">
            أنشئ كلمة مرور لحساب الفرع للتمكن من الدخول إلى لوحة المكتب.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">كلمة المرور الجديدة</label>
            <div className="relative">
              <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                dir="ltr"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pr-10 pl-10 text-white placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">تأكيد كلمة المرور</label>
            <div className="relative">
              <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                dir="ltr"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pr-10 pl-10 text-white placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pageState === 'saving'}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {pageState === 'saving' ? 'جارٍ الحفظ...' : 'تعيين كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdatePasswordLoading />}>
      <UpdatePasswordContent />
    </Suspense>
  );
}