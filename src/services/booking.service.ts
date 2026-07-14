import apiClient from '@/lib/api/axios';
import {
  applyScopedRestIdFilter,
  getCurrentAdminScope,
  getScopedBookingRequestIds,
  getScopedOfficeIds,
  type ScopedIdList,
} from './admin-scope.service';
import type { BookingRequest, BookingRequestOffice, BookingOffer } from '@/types';

export interface BookingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

function outsideScopeError() {
  return { message: 'Record is outside admin data scope', status: 403, code: 'outside_admin_scope' };
}

function applyRequestScope(query: Record<string, string>, requestIds: ScopedIdList): Record<string, string> {
  return applyScopedRestIdFilter(query, 'id', requestIds);
}

function applyOfficeScope(query: Record<string, string>, officeIds: ScopedIdList): Record<string, string> {
  return applyScopedRestIdFilter(query, 'office_id', officeIds);
}

export const bookingService = {
  async listRequests(params?: BookingQueryParams): Promise<{ data: BookingRequest[]; count: number }> {
    const scope = await getCurrentAdminScope();
    const requestIds = await getScopedBookingRequestIds(scope);
    let query: Record<string, string> = {
      select: '*',
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

    if (params?.search) {
      query.full_name = `ilike.*${params.search}*`;
    }

    if (params?.status) {
      query.status = `eq.${params.status}`;
    }

    query = applyRequestScope(query, requestIds);

    const res = await apiClient.get<BookingRequest[]>('/BookingRequests', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getRequestById(id: string): Promise<BookingRequest> {
    const scope = await getCurrentAdminScope();
    const requestIds = await getScopedBookingRequestIds(scope);
    const query = applyRequestScope({ id: `eq.${id}`, select: '*' }, requestIds);
    const res = await apiClient.get<BookingRequest[]>('/BookingRequests', { params: query });
    if (!res.data.length) throw { message: 'Request not found', status: 404 };
    return res.data[0];
  },

  async updateRequestStatus(id: string, status: string): Promise<BookingRequest> {
    const scope = await getCurrentAdminScope();
    const requestIds = await getScopedBookingRequestIds(scope);
    const query = applyRequestScope({ id: `eq.${id}` }, requestIds);
    const res = await apiClient.patch<BookingRequest[]>('/BookingRequests', { status }, {
      params: query,
      headers: { Prefer: 'return=representation' },
    });
    if (!res.data.length) throw outsideScopeError();
    return res.data[0];
  },

  async listRequestOffices(requestId: string): Promise<BookingRequestOffice[]> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const query = applyOfficeScope({
      request_id: `eq.${requestId}`,
      select: '*,office:office_id(*)',
      order: 'created_at.desc',
    }, officeIds);

    const res = await apiClient.get<BookingRequestOffice[]>('/BookingRequestOffices', { params: query });
    return res.data;
  },

  async listRequestOffers(requestId: string): Promise<BookingOffer[]> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const query = applyOfficeScope({
      request_id: `eq.${requestId}`,
      select: '*,office:office_id(*)',
      order: 'created_at.desc',
    }, officeIds);

    const res = await apiClient.get<BookingOffer[]>('/BookingOffers', { params: query });
    return res.data;
  },

  async markOfficeAsRead(id: string): Promise<void> {
    const scope = await getCurrentAdminScope();
    const officeIds = await getScopedOfficeIds(scope, true);
    const query = applyOfficeScope({ id: `eq.${id}` }, officeIds);
    await apiClient.patch('/BookingRequestOffices', { is_read: true, status: 'viewed' }, { params: query });
  },
};