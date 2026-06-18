'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { favoritesService } from '@/services/favorites.service';
import { StatCard } from '@/components/ui/StatCard';
import { FiHeart } from 'react-icons/fi';

export default function FavoritesPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['favorites-stats'],
    queryFn: () => favoritesService.getStats(),
  });



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.favorites.title}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title={t.favorites.totalFavorites} value={stats?.totalFavorites ?? 0} icon={<FiHeart />} color="from-pink-600 to-pink-700" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.favorites.mostLikedCars}</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-700/50" />)}
            </div>
          ) : stats?.topCars.length ? (
            <div className="space-y-2">
              {stats.topCars.map((car, i) => (
                <div key={car.car_id} className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{i + 1}</span>
                    <span className="text-sm text-gray-300">{car.car_id.slice(0, 8)}...</span>
                  </div>
                  <span className="text-sm font-medium text-pink-400">{car.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t.common.noData}</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.favorites.topUsers}</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-700/50" />)}
            </div>
          ) : stats?.topUsers.length ? (
            <div className="space-y-2">
              {stats.topUsers.map((user, i) => (
                <div key={user.user_id} className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{i + 1}</span>
                    <span className="text-sm text-gray-300">{user.user_id.slice(0, 8)}...</span>
                  </div>
                  <span className="text-sm font-medium text-blue-500">{user.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t.common.noData}</p>
          )}
        </div>
      </div>
    </div>
  );
}
