import apiClient from '@/lib/api/axios';
import { applyAdminScopeToRestQuery, SCOPE_DENY_UUID, type ResolvedAdminScope } from '@/lib/admin-scope';
import type { Car, BookingRequest } from '@/types';
import { getCurrentAdminScope } from './admin-scope.service';

function getCountFromContentRange(contentRange?: string): number | null {
  const total = contentRange?.split('/')[1];
  if (!total || total === '*') return null;
  const count = Number(total);
  return Number.isFinite(count) ? count : null;
}

function inFilter(ids: string[]): string {
  if (ids.length === 0) return `eq.${SCOPE_DENY_UUID}`;
  return `in.(${ids.join(',')})`;
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

function applyScope(query: Record<string, string>, scope: ResolvedAdminScope): Record<string, string> {
  return applyAdminScopeToRestQuery(query, scope, {
    countryField: 'country',
    cityField: 'city',
  });
}

async function getScopedOfficeIds(scope: ResolvedAdminScope, includeBranches = true): Promise<string[]> {
  const query = applyScope({
    select: 'id',
    ...(includeBranches ? {} : { is_sub_branch: 'eq.false' }),
  }, scope);
  const offices = await fetchAllRows<{ id: string }>('/Offices', query);
  return offices.map((office) => office.id).filter(Boolean);
}

async function getScopedCarIds(officeIds: string[]): Promise<string[]> {
  if (officeIds.length === 0) return [];
  const cars = await fetchAllRows<{ id: string }>('/cars', {
    select: 'id',
    office_id: inFilter(officeIds),
  });
  return cars.map((car) => car.id).filter(Boolean);
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
    const scope = await getCurrentAdminScope();
    const userFilters = applyScope({}, scope);
    const officeFilters = applyScope({ is_sub_branch: 'eq.false' }, scope);
    const branchFilters = applyScope({ is_sub_branch: 'eq.true', is_active: 'eq.true' }, scope);
    const scopedOfficeIds = await getScopedOfficeIds(scope, true);
    const scopedCarIds = await getScopedCarIds(scopedOfficeIds);
    const officeIdFilter = inFilter(scopedOfficeIds);
    const carIdFilter = inFilter(scopedCarIds);

    const [totalUsers, totalOffices, totalCars, activeCars, pendingRequests, offersCount, favoritesCount, activeBranches] = await Promise.all([
      safeCountRows('/Users', userFilters),
      safeCountRows('/Offices', officeFilters),
      safeCountRows('/cars', { office_id: officeIdFilter }),
      safeCountRows('/cars', { office_id: officeIdFilter, is_active: 'eq.true' }),
      safeCountRows('/BookingRequestOffices', { office_id: officeIdFilter, status: 'eq.pending' }),
      safeCountRows('/BookingOffers', { office_id: officeIdFilter }),
      safeCountRows('/Favorites', { car_id: carIdFilter }),
      safeCountRows('/Offices', branchFilters),
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
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const requests = await fetchAllRows<BookingRequest>('/BookingRequestOffices', {
      select: 'created_at',
      office_id: inFilter(officeIds),
      order: 'created_at.asc',
    } as Record<string, string>);

    const grouped: Record<string, number> = {};
    requests.forEach((r) => {
      const date = r.created_at?.split('T')[0];
      if (date) grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  },

  async getCarsByBrand(): Promise<{ brand: string; count: number }[]> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const cars = await fetchAllRows<Car>('/cars', {
      select: 'brand',
      office_id: inFilter(officeIds),
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
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    let offers: { office_id: string; office?: { office_name?: string } }[];

    try {
      offers = await fetchAllRows<{ office_id: string; office?: { office_name?: string } }>('/BookingOffers', {
        select: 'office_id,office:office_id(office_name)',
        office_id: inFilter(officeIds),
      });
    } catch {
      offers = await fetchAllRows<{ office_id: string }>('/BookingOffers', {
        select: 'office_id',
        office_id: inFilter(officeIds),
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