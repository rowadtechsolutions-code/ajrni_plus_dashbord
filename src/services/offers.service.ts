import apiClient from '@/lib/api/axios';
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

export const offersService = {
  async list(params?: OffersQueryParams): Promise<{ data: BookingOffer[]; count: number }> {
    const query: Record<string, string> = {
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

    if (params?.office_id) {
      query.office_id = `eq.${params.office_id}`;
    }

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
    const res = await apiClient.get<BookingOffer[]>('/BookingOffers', {
      params: { id: `eq.${id}`, select: '*,request:request_id(*),office:office_id(*)' },
    });
    if (!res.data.length) throw { message: 'Offer not found', status: 404 };
    return res.data[0];
  },

  async updateStatus(id: string, status: string): Promise<BookingOffer> {
    const res = await apiClient.patch<BookingOffer[]>(`/BookingOffers?id=eq.${id}`, { status }, {
      headers: { Prefer: 'return=representation' },
    });
    return res.data[0];
  },
};
