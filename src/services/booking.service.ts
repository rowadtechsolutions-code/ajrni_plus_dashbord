import apiClient from '@/lib/api/axios';
import type { BookingRequest, BookingRequestOffice, BookingOffer } from '@/types';

export interface BookingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const bookingService = {
  async listRequests(params?: BookingQueryParams): Promise<{ data: BookingRequest[]; count: number }> {
    const query: Record<string, string> = {
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

    const res = await apiClient.get<BookingRequest[]>('/BookingRequests', {
      params: query,
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers['content-range']?.split('/')[1] || res.data.length);
    return { data: res.data, count: total };
  },

  async getRequestById(id: string): Promise<BookingRequest> {
    const res = await apiClient.get<BookingRequest[]>('/BookingRequests', {
      params: { id: `eq.${id}`, select: '*' },
    });
    if (!res.data.length) throw { message: 'Request not found', status: 404 };
    return res.data[0];
  },

  async updateRequestStatus(id: string, status: string): Promise<BookingRequest> {
    const res = await apiClient.patch<BookingRequest[]>(`/BookingRequests?id=eq.${id}`, { status }, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },

  async listRequestOffices(requestId: string): Promise<BookingRequestOffice[]> {
    const res = await apiClient.get<BookingRequestOffice[]>('/BookingRequestOffices', {
      params: {
        request_id: `eq.${requestId}`,
        select: '*,office:office_id(*)',
        order: 'created_at.desc',
      },
    });
    return res.data;
  },

  async listRequestOffers(requestId: string): Promise<BookingOffer[]> {
    const res = await apiClient.get<BookingOffer[]>('/BookingOffers', {
      params: {
        request_id: `eq.${requestId}`,
        select: '*,office:office_id(*)',
        order: 'created_at.desc',
      },
    });
    return res.data;
  },

  async markOfficeAsRead(id: string): Promise<void> {
    await apiClient.patch(`/BookingRequestOffices?id=eq.${id}`, { is_read: true, status: 'viewed' });
  },
};
