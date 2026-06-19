'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { favoritesService } from '@/services/favorites.service';
import { Table } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/StatCard';
import { FiHeart } from 'react-icons/fi';
import type { Favorite } from '@/types';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', page],
    queryFn: () => favoritesService.list({ page, limit }),
  });

  const { data: stats } = useQuery({
    queryKey: ['favorites-stats'],
    queryFn: () => favoritesService.getStats(),
  });

  const columns = [
    {
      key: 'car',
      label: t.cars.name,
      render: (fav: Favorite) => (
        <span className="flex items-center gap-3 text-white">
          {fav.car?.image && (
            <img src={fav.car.image} alt={fav.car.name} className="h-10 w-10 rounded-lg object-cover" />
          )}
          {fav.car?.name || '-'}
        </span>
      ),
    },
    { key: 'brand', label: t.cars.brand, render: (fav: Favorite) => fav.car?.brand || '-' },
    { key: 'model', label: t.cars.model, render: (fav: Favorite) => fav.car?.model || '-' },
    { key: 'year', label: t.cars.year, render: (fav: Favorite) => fav.car?.year || '-' },
    { key: 'price', label: t.cars.price, render: (fav: Favorite) => fav.car?.price || '-' },
    {
      key: 'office',
      label: t.cars.office,
      render: (fav: Favorite) => fav.car?.office?.office_name || '-',
    },
    {
      key: 'created_at',
      label: t.common.date,
      render: (fav: Favorite) => new Date(fav.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.favorites.title}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title={t.favorites.totalFavorites} value={stats?.totalFavorites ?? 0} icon={<FiHeart />} color="from-pink-600 to-pink-700" loading={isLoading} />
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        pagination={{ currentPage: page, totalPages: Math.ceil((data?.count || 0) / limit), onPageChange: setPage }}
      />
    </div>
  );
}
