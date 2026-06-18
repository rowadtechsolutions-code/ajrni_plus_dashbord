'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { favoritesService } from '@/services/favorites.service';
import { StatCard } from '@/components/ui/StatCard';
import { FiHeart } from 'react-icons/fi';

export default function FavoritesPage() {
  const { t } = useTranslation();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.list(100),
  });

  const { data: stats } = useQuery({
    queryKey: ['favorites-stats'],
    queryFn: () => favoritesService.getStats(),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.favorites.title}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title={t.favorites.totalFavorites} value={stats?.totalFavorites ?? 0} icon={<FiHeart />} color="from-pink-600 to-pink-700" loading={isLoading} />
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">{t.favorites.mostLikedCars}</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-700/50" />)}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div key={fav.id} className="flex items-center justify-between rounded-lg bg-gray-800 p-4">
                <div className="flex items-center gap-4">
                  {fav.car?.image && (
                    <img src={fav.car.image} alt={fav.car.name} className="h-16 w-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{fav.car?.name || 'Unknown Car'}</p>
                    <p className="text-xs text-gray-400">{fav.car?.brand} {fav.car?.model} {fav.car?.year}</p>
                    <p className="text-xs text-gray-500">{fav.car?.office?.office_name || 'Unknown Office'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-pink-400">{fav.car?.price || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{new Date(fav.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t.common.noData}</p>
        )}
      </div>
    </div>
  );
}
