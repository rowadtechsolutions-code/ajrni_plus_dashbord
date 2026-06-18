import apiClient from '@/lib/api/axios';
import type { Favorite } from '@/types';

export const favoritesService = {
  async list(limit?: number): Promise<Favorite[]> {
    const params: Record<string, string> = {
      select: '*,user:users(*),car:cars(office:office_id(*))',
      limit: String(limit || 50),
    };
    const res = await apiClient.get<Favorite[]>('/Favorites', { params });
    return res.data;
  },

  async getStats(): Promise<{ totalFavorites: number; topCars: { car_id: string; count: number }[]; topUsers: { user_id: string; count: number }[] }> {
    const favorites = await favoritesService.list(1000);
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
