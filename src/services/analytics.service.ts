import apiClient from '@/lib/api/axios';
import type { Car, BookingRequest } from '@/types';
import { getBranchLinkedOfficeIds, getActiveBranchesCount } from './branch-utils.service';

function getCountFromContentRange(contentRange?: string): number | null {
  const total = contentRange?.split('/')[1];
  if (!total || total === '*') return null;
  const count = Number(total);
  return Number.isFinite(count) ? count : null;
}

async function countRows(endpoint: string, filters?: Record<string, string>): Promise<number> {
  const res = await apiClient.get<unknown[]>(endpoint, {
    params: { select: 'id', limit: '1', ...filters },
    headers: {
      Prefer: 'count=exact',
    },
  });

  const count = getCountFromContentRange(res.headers['content-range']);
  if (count !== null) return count;

  if (res.data.length === 0) return 0;
  return fetchAllRows<unknown>(endpoint, { select: 'id', ...filters }).then((rows) => rows.length);
}

async function safeCountRows(endpoint: string, filters?: Record<string, string>): Promise<number> {
  try {
    return await countRows(endpoint, filters);
  } catch {
    return 0;
  }
}

async function fetchAllRows<T>(endpoint: string, params: Record<string, string>, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  let page = 0;

  while (true) {
    const res = await apiClient.get<T[]>(endpoint, {
      params: {
        ...params,
        limit: String(pageSize),
        offset: String(page * pageSize),
      },
    });

    rows.push(...res.data);
    if (res.data.length < pageSize) break;
    page += 1;
  }

  return rows;
}

export const analyticsService = {
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalOffices: number;
    totalCars: number;
    activeCars: number;
    pendingRequests: number;
    offersCount: number;
    favoritesCount: number;
    activeBranches: number;
  }> {
    const branchIds = await getBranchLinkedOfficeIds();
    const officeFilters: Record<string, string> = {};
    if (branchIds.length > 0) {
      officeFilters.id = `not.in.(${branchIds.join(',')})`;
    }

    const [totalUsers, totalOffices, totalCars, activeCars, pendingRequests, offersCount, favoritesCount, activeBranches] = await Promise.all([
      safeCountRows('/Users'),
      safeCountRows('/Offices', officeFilters),
      safeCountRows('/cars'),
      safeCountRows('/cars', { is_active: 'eq.true' }),
      safeCountRows('/BookingRequests', { status: 'eq.pending' }),
      safeCountRows('/BookingOffers'),
      safeCountRows('/Favorites'),
      getActiveBranchesCount(),
    ]);

    return {
      totalUsers,
      totalOffices,
      totalCars,
      activeCars,
      pendingRequests,
      offersCount,
      favoritesCount,
      activeBranches,
    };
  },

  async getRequestsOverTime(): Promise<{ date: string; count: number }[]> {
    const requests = await fetchAllRows<BookingRequest>('/BookingRequests', {
      select: 'created_at',
      order: 'created_at.asc',
    });

    const grouped: Record<string, number> = {};
    requests.forEach((r) => {
      const date = r.created_at?.split('T')[0];
      if (date) grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  },

  async getCarsByBrand(): Promise<{ brand: string; count: number }[]> {
    const cars = await fetchAllRows<Car>('/cars', {
      select: 'brand',
    });

    const grouped: Record<string, number> = {};
    cars.forEach((c) => {
      if (c.brand) grouped[c.brand] = (grouped[c.brand] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  },

  async getOfficesActivity(): Promise<{ office_id: string; office_name: string; count: number }[]> {
    let offers: { office_id: string; office?: { office_name?: string } }[];

    try {
      offers = await fetchAllRows<{ office_id: string; office?: { office_name?: string } }>('/BookingOffers', {
        select: 'office_id,office:office_id(office_name)',
      });
    } catch {
      offers = await fetchAllRows<{ office_id: string }>('/BookingOffers', {
        select: 'office_id',
      });
    }

    const grouped: Record<string, { office_id: string; office_name: string; count: number }> = {};
    offers.forEach((offer) => {
      if (!offer.office_id) return;
      grouped[offer.office_id] ??= {
        office_id: offer.office_id,
        office_name: offer.office?.office_name || offer.office_id.slice(0, 8),
        count: 0,
      };
      grouped[offer.office_id].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },
};
