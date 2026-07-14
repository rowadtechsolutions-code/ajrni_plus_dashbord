import apiClient from '@/lib/api/axios';
import { applyAdminScopeToRestQuery, SCOPE_DENY_UUID, type ResolvedAdminScope } from '@/lib/admin-scope';
import { normalizeCommercialReg } from './offices.service';
import { getCurrentAdminScope } from './admin-scope.service';

interface PeriodRow {
  id: string;
  created_at: string;
}

interface PeriodBookingRequest extends PeriodRow {
  status: string;
  user_id?: string;
}

interface PeriodUser extends PeriodRow {
  country?: string;
  city?: string;
}

interface PeriodOffice extends PeriodRow {
  office_name?: string;
  country?: string;
  city?: string;
  phone_number?: string;
  is_active?: boolean;
  commercial_registration_number?: string;
}

interface ReviewOffice {
  id: string;
  office_name: string;
  phone_number: string;
  country: string;
  city: string;
  created_at: string;
  is_active: boolean;
  commercial_registration_number: string;
}

export interface PeriodAnalyticsData {
  bookingRequests: PeriodBookingRequest[];
  prevBookingRequests: PeriodBookingRequest[];
  newUsers: PeriodUser[];
  prevNewUsers: PeriodUser[];
  newOffices: PeriodOffice[];
  prevNewOffices: PeriodOffice[];
  newCars: PeriodRow[];
  prevNewCars: PeriodRow[];
}

export interface AllOfficesData {
  offices: ReviewOffice[];
  duplicateGroups: Map<string, ReviewOffice[]>;
}

export interface TopOfficeEntry {
  office_id: string;
  office_name: string;
  offerCount: number;
}

export interface GeoEntry {
  country: string;
  userCount: number;
  officeCount: number;
}

function inFilter(ids: string[]): string {
  if (ids.length === 0) return `eq.${SCOPE_DENY_UUID}`;
  return `in.(${ids.join(',')})`;
}

function applyScope(query: Record<string, string>, scope: ResolvedAdminScope): Record<string, string> {
  return applyAdminScopeToRestQuery(query, scope, {
    countryField: 'country',
    cityField: 'city',
  });
}

async function fetchRowsInPeriod<T>(
  endpoint: string,
  select: string,
  fromDate: string,
  toDate: string,
  filters?: Record<string, string>,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 0;
  const pageSize = 1000;
  const fromISO = `${fromDate}T00:00:00.000Z`;
  const nextDay = new Date(new Date(toDate + 'T00:00:00Z').getTime() + 86400000);
  const toISO = nextDay.toISOString();

  while (true) {
    const res = await apiClient.get<T[]>(endpoint, {
      params: {
        select,
        ...filters,
        order: 'created_at.asc',
        limit: String(pageSize),
        offset: String(page * pageSize),
        and: `(created_at.gte.${fromISO},created_at.lt.${toISO})`,
      },
    });
    rows.push(...res.data);
    if (res.data.length < pageSize) break;
    page += 1;
  }

  return rows;
}

async function fetchRowsFiltered<T>(
  endpoint: string,
  select: string,
  filters?: Record<string, string>,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 0;
  const pageSize = 1000;
  const params: Record<string, string> = { select, ...filters };

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

async function getScopedOfficeIds(scope: ResolvedAdminScope, includeBranches = true): Promise<string[]> {
  const query = applyScope({
    select: 'id',
    ...(includeBranches ? {} : { is_sub_branch: 'eq.false' }),
  }, scope);
  const offices = await fetchRowsFiltered<{ id: string }>('/Offices', 'id', query);
  return offices.map((office) => office.id).filter(Boolean);
}

function getDateRange(fromDate: string, toDate: string): { from: string; to: string; prevFrom: string; prevTo: string } {
  const from = new Date(fromDate + 'T00:00:00Z');
  const to = new Date(toDate + 'T00:00:00Z');
  const daysDiff = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (daysDiff - 1) * 86400000);
  return {
    from: fromDate,
    to: toDate,
    prevFrom: prevFrom.toISOString().split('T')[0],
    prevTo: prevTo.toISOString().split('T')[0],
  };
}

const BASE_SELECT = 'id,created_at';
const REQUEST_SELECT = `${BASE_SELECT},status`;
const USER_SELECT = `${BASE_SELECT},country,city`;
const OFFICE_FULL_SELECT = `${BASE_SELECT},office_name,phone_number,country,city,is_active,commercial_registration_number`;

export const analyticsEnhancedService = {
  async getPeriodData(fromDate: string, toDate: string): Promise<PeriodAnalyticsData> {
    const scope = await getCurrentAdminScope();
    const { prevFrom, prevTo } = getDateRange(fromDate, toDate);
    const userFilters = applyScope({}, scope);
    const officeFilters = applyScope({ is_sub_branch: 'eq.false' }, scope);
    const officeIds = await getScopedOfficeIds(scope, true);
    const officeIdFilter = inFilter(officeIds);

    const [bookingRequests, prevBookingRequests, newUsers, prevNewUsers, newOffices, prevNewOffices, newCars, prevNewCars] =
      await Promise.all([
        fetchRowsInPeriod<PeriodBookingRequest>('/BookingRequestOffices', REQUEST_SELECT, fromDate, toDate, { office_id: officeIdFilter }),
        fetchRowsInPeriod<PeriodBookingRequest>('/BookingRequestOffices', REQUEST_SELECT, prevFrom, prevTo, { office_id: officeIdFilter }),
        fetchRowsInPeriod<PeriodUser>('/Users', USER_SELECT, fromDate, toDate, userFilters),
        fetchRowsInPeriod<PeriodUser>('/Users', USER_SELECT, prevFrom, prevTo, userFilters),
        fetchRowsInPeriod<PeriodOffice>('/Offices', OFFICE_FULL_SELECT, fromDate, toDate, officeFilters),
        fetchRowsInPeriod<PeriodOffice>('/Offices', OFFICE_FULL_SELECT, prevFrom, prevTo, officeFilters),
        fetchRowsInPeriod<PeriodRow>('/cars', BASE_SELECT, fromDate, toDate, { office_id: officeIdFilter }),
        fetchRowsInPeriod<PeriodRow>('/cars', BASE_SELECT, prevFrom, prevTo, { office_id: officeIdFilter }),
      ]);

    return { bookingRequests, prevBookingRequests, newUsers, prevNewUsers, newOffices, prevNewOffices, newCars, prevNewCars };
  },

  async getAllOfficesForReview(): Promise<{ offices: ReviewOffice[]; duplicateGroups: Map<string, ReviewOffice[]> }> {
    const scope = await getCurrentAdminScope();
    const offices = await fetchRowsFiltered<ReviewOffice>('/Offices', OFFICE_FULL_SELECT, applyScope({ is_sub_branch: 'eq.false' }, scope));

    const duplicateMap = new Map<string, ReviewOffice[]>();
    for (const office of offices) {
      const normalized = normalizeCommercialReg(office.commercial_registration_number);
      if (!normalized) continue;
      const group = duplicateMap.get(normalized) || [];
      group.push(office);
      duplicateMap.set(normalized, group);
    }
    for (const [key, group] of duplicateMap.entries()) {
      if (group.length < 2) duplicateMap.delete(key);
    }

    return { offices, duplicateGroups: duplicateMap };
  },

  async getTopOffices(): Promise<TopOfficeEntry[]> {
    try {
      const scope = await getCurrentAdminScope();
      const officeIds = await getScopedOfficeIds(scope, true);
      const offers = await fetchRowsFiltered<{ office_id: string; office?: { office_name?: string } }>(
        '/BookingOffers',
        'office_id,office:office_id(office_name)',
        { office_id: inFilter(officeIds) },
      );

      const map = new Map<string, TopOfficeEntry>();
      for (const offer of offers) {
        if (!offer.office_id) continue;
        if (!map.has(offer.office_id)) {
          map.set(offer.office_id, {
            office_id: offer.office_id,
            office_name: offer.office?.office_name || offer.office_id.slice(0, 8),
            offerCount: 0,
          });
        }
        map.get(offer.office_id)!.offerCount += 1;
      }

      return Array.from(map.values()).sort((a, b) => b.offerCount - a.offerCount).slice(0, 10);
    } catch {
      return [];
    }
  },

  async getGeoDistribution(): Promise<GeoEntry[]> {
    try {
      const scope = await getCurrentAdminScope();
      const [users, offices] = await Promise.all([
        fetchRowsFiltered<{ country?: string }>('/Users', 'country', applyScope({}, scope)),
        fetchRowsFiltered<{ id: string; country?: string }>('/Offices', 'id,country', applyScope({ is_sub_branch: 'eq.false' }, scope)),
      ]);

      const userMap = new Map<string, number>();
      const officeMap = new Map<string, number>();
      const allCountries = new Set<string>();

      for (const u of users) {
        if (!u.country) continue;
        allCountries.add(u.country);
        userMap.set(u.country, (userMap.get(u.country) || 0) + 1);
      }
      for (const o of offices) {
        if (!o.country) continue;
        allCountries.add(o.country);
        officeMap.set(o.country, (officeMap.get(o.country) || 0) + 1);
      }

      return Array.from(allCountries)
        .map((country) => ({
          country,
          userCount: userMap.get(country) || 0,
          officeCount: officeMap.get(country) || 0,
        }))
        .sort((a, b) => (b.userCount + b.officeCount) - (a.userCount + a.officeCount));
    } catch {
      return [];
    }
  },

  getDatePreset(preset: string): { from: string; to: string } {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case '7d':
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 86400000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 86400000);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'prevMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        from = new Date(now.getTime() - 30 * 86400000);
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  },
};