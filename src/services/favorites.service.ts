import apiClient from '@/lib/api/axios';
import type { Favorite } from '@/types';

export interface FavoritesQueryParams {
  page?: number;
  limit?: number;
}

export const favoritesService = {
  async list(params?: FavoritesQueryParams): Promise<{ data: Favorite[]; count: number }> {
    const query: Record<string, string> = {
      select: '*,car:car_id(*,office:office_id(*))',
      order: 'created_at.desc',
    };

    if (params?.limit) {
      query.limit = String(params.limit);
      if (params?.page && params.page > 1) {
        query.offset = String((params.page - 1) * params.limit);
      }
    }

    const res = await apiClient.get<Favorite[]>('/Favorites', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getStats(): Promise<{ totalFavorites: number; topCars: { car_id: string; count: number }[]; topUsers: { user_id: string; count: number }[] }> {
    const res = await favoritesService.list({ limit: 1000 });
    const favorites = res.data;
    const carCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    favorites.forEach((fav) => {
      carCounts[fav.car_id] = (carCounts[fav.car_id] || 0) + 1;
      userCounts[fav.user_id] = (userCounts[fav.user_id] || 0) + 1;
    });

    const topCars = Object.entries(carCounts)
      .map(([car_id, count]) => ({ car_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Object.entries(userCounts)
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { totalFavorites: favorites.length, topCars, topUsers };
  },
};
