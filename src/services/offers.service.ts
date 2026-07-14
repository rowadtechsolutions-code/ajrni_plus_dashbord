import apiClient from '@/lib/api/axios';
import { SCOPE_DENY_UUID } from '@/lib/admin-scope';
import {
  applyScopedRestIdFilter,
  getCurrentAdminScope,
  getScopedOfficeIds,
  type ScopedIdList,
} from './admin-scope.service';
import type { BookingOffer } from '@/types';

export interface OffersQueryParams {
  page?: number;
  limit?: number;
  request_id?: string;
  office_id?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

function outsideScopeError() {
  return { message: 'Record is outside admin data scope', status: 403, code: 'outside_admin_scope' };
}

function applyOfferOfficeScope(
  query: Record<string, string>,
  officeIds: ScopedIdList,
  requestedOfficeId?: string,
): Record<string, string> {
  if (requestedOfficeId) {
    if (officeIds !== null && !officeIds.includes(requestedOfficeId)) {
      return { ...query, office_id: `eq.${SCOPE_DENY_UUID}` };
    }
    return { ...query, office_id: `eq.${requestedOfficeId}` };
  }

  return applyScopedRestIdFilter(query, 'office_id', officeIds);
}

export const offersService = {
  async list(params?: OffersQueryParams): Promise<{ data: BookingOffer[]; count: number }> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    let query: Record<string, string> = {
      select: '*,request:request_id(*),office:office_id(*)',
    };

    if (params?.limit) {
      query.limit = String(params.limit);
      if (params?.page && params.page > 1) {
        query.offset = String((params.page - 1) * params.limit);
      }
    }

    if (params?.sort) {
      query.order = `${params.sort}.${params.order || 'desc'}`;
    }

    if (params?.request_id) {
      query.request_id = `eq.${params.request_id}`;
    }

    query = applyOfferOfficeScope(query, officeIds, params?.office_id);

    if (params?.status) {
      query.status = `eq.${params.status}`;
    }

    const res = await apiClient.get<BookingOffer[]>('/BookingOffers', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getById(id: string): Promise<BookingOffer> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const query = applyOfferOfficeScope({ id: `eq.${id}`, select: '*,request:request_id(*),office:office_id(*)' }, officeIds);
    const res = await apiClient.get<BookingOffer[]>('/BookingOffers', { params: query });
    if (!res.data.length) throw { message: 'Offer not found', status: 404 };
    return res.data[0];
  },

  async updateStatus(id: string, status: string): Promise<BookingOffer> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const query = applyOfferOfficeScope({ id: `eq.${id}` }, officeIds);
    const res = await apiClient.patch<BookingOffer[]>('/BookingOffers', { status }, {
      params: query,
      headers: { Prefer: 'return=representation' },
    });
    if (!res.data.length) throw outsideScopeError();
    return res.data[0];
  },
};