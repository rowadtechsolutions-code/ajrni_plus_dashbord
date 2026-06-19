import apiClient from '@/lib/api/axios';
import type { Favorite, User } from '@/types';

export interface FavoritesQueryParams {
  page?: number;
  limit?: number;
}

export const favoritesService = {
  async list(params?: FavoritesQueryParams): Promise<{ data: Favorite[]; count: number }> {
    const query: Record<string, string> = {
      select: '*,car:car_id!left(*,office:office_id!left(*))',
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
    const data = res.data;

    const userIds = [...new Set(data.map(f => f.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const userRes = await apiClient.get('/Users', {
        params: { id: `in.(${userIds.join(',')})`, select: 'id,full_name' },
      });
      const userMap: Record<string, string> = {};
      (userRes.data as { id: string; full_name: string }[]).forEach(u => { userMap[u.id] = u.full_name; });
      data.forEach(f => { if (userMap[f.user_id]) f.user = { id: f.user_id, full_name: userMap[f.user_id] } as User; });
    }

    return { data, count: total };
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
