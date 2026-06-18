import apiClient from '@/lib/api/axios';
import type { Car, BookingRequest } from '@/types';

export const analyticsService = {
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalOffices: number;
    totalCars: number;
    activeCars: number;
    pendingRequests: number;
    offersCount: number;
    favoritesCount: number;
  }> {
    const [
      usersRes, officesRes, carsRes, pendingRes, offersRes, favsRes,
    ] = await Promise.all([
      apiClient.get('/Users', { params: { select: 'count' }, headers: { Prefer: 'count=exact' } }),
      apiClient.get('/Offices', { params: { select: 'count' }, headers: { Prefer: 'count=exact' } }),
      apiClient.get('/cars', { params: { select: 'count' }, headers: { Prefer: 'count=exact' } }),
      apiClient.get('/BookingRequests', { params: { select: 'count', status: 'eq.pending' }, headers: { Prefer: 'count=exact' } }),
      apiClient.get('/BookingOffers', { params: { select: 'count' }, headers: { Prefer: 'count=exact' } }),
      apiClient.get('/Favorites', { params: { select: 'count' }, headers: { Prefer: 'count=exact' } }),
    ]);

    return {
      totalUsers: Number(usersRes.headers['content-range']?.split('/')[1] || 0),
      totalOffices: Number(officesRes.headers['content-range']?.split('/')[1] || 0),
      totalCars: Number(carsRes.headers['content-range']?.split('/')[1] || 0),
      activeCars: 0,
      pendingRequests: Number(pendingRes.headers['content-range']?.split('/')[1] || 0),
      offersCount: Number(offersRes.headers['content-range']?.split('/')[1] || 0),
      favoritesCount: Number(favsRes.headers['content-range']?.split('/')[1] || 0),
    };
  },

  async getRequestsOverTime(): Promise<{ date: string; count: number }[]> {
    const res = await apiClient.get<BookingRequest[]>('/BookingRequests', {
      params: { select: 'created_at', order: 'created_at.asc' },
    });

    const grouped: Record<string, number> = {};
    res.data.forEach((r) => {
      const date = r.created_at?.split('T')[0];
      if (date) grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  },

  async getCarsByBrand(): Promise<{ brand: string; count: number }[]> {
    const res = await apiClient.get<Car[]>('/cars', {
      params: { select: 'brand' },
    });

    const grouped: Record<string, number> = {};
    res.data.forEach((c) => {
      if (c.brand) grouped[c.brand] = (grouped[c.brand] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  },

  async getOfficesActivity(): Promise<{ office_id: string; count: number }[]> {
    const res = await apiClient.get('/BookingOffers', {
      params: { select: 'office_id' },
    });
    const grouped: Record<string, number> = {};
    (res.data as { office_id: string }[]).forEach((o) => {
      if (o.office_id) grouped[o.office_id] = (grouped[o.office_id] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([office_id, count]) => ({ office_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },
};
