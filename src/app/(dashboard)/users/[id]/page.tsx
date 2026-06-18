'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { usersService } from '@/services/users.service';
import { FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';

export default function UserDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', params.id],
    queryFn: () => usersService.getById(params.id as string),
    enabled: !!params.id,
  });

  if (isLoading) return <div className="text-gray-400">{t.common.loading}</div>;
  if (!user) return <div className="text-gray-400">{t.common.noData}</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <FiArrowLeft size={18} />
        {t.common.back}
      </button>
      <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-gray-500">{t.users.fullName}</label>
            <p className="text-white">{user.full_name}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.users.email}</label>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.users.phone}</label>
            <p className="text-white">{user.phone_number}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.users.country}</label>
            <p className="text-white">{user.country}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.users.city}</label>
            <p className="text-white">{user.city}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.users.createdAt}</label>
            <p className="text-white">{user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd HH:mm') : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
