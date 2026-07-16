import { supabase } from '@/lib/supabase/client';
import type { Office, User } from '@/types';

export type NotificationTargetType = 'user' | 'office' | 'all_users' | 'all_offices' | 'all';

export type AdminNotificationType =
  | 'general'
  | 'request_created'
  | 'request_accepted'
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_completed'
  | 'new_customer_request'
  | 'car_approved'
  | 'car_rejected'
  | 'office_approved'
  | 'promotion';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: AdminNotificationType | string;
  reference_id: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient_name?: string;
  recipient_kind?: 'user' | 'office';
}

export interface SendAdminNotificationPayload {
  target_type: NotificationTargetType;
  target_id?: string;
  title: string;
  body: string;
  type: AdminNotificationType;
  reference_id?: string;
  data?: Record<string, unknown>;
  saveToHistory?: boolean;
}

export interface SendAdminNotificationResult {
  success: boolean;
  targeted_users: number;
  saved_notifications: number;
  targeted_tokens: number;
  sent: number;
  failed: number;
  invalid_tokens?: number;
  message?: string;
  history_save_error?: string;
}

const sanitizeSearch = (search?: string) => {
  return search?.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ') || '';
};

export const notificationsService = {
  async searchUsers(search: string): Promise<User[]> {
    const value = sanitizeSearch(search);
    let query = supabase
      .from('Users')
      .select('id,full_name,email,phone_number,country,city,created_at')
      .order('full_name', { ascending: true })
      .limit(20);

    if (value) {
      query = query.or(`full_name.ilike.%${value}%,email.ilike.%${value}%,phone_number.ilike.%${value}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as User[];
  },

  async searchOffices(search: string): Promise<Office[]> {
    const value = sanitizeSearch(search);
    let query = supabase
      .from('Offices')
      .select('id,office_name,email,phone_number,country,city,is_active,image,created_at')
      .order('office_name', { ascending: true })
      .limit(20);

    if (value) {
      query = query.or(`office_name.ilike.%${value}%,email.ilike.%${value}%,phone_number.ilike.%${value}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as Office[];
  },

  async countTargets(targetType: NotificationTargetType): Promise<number | null> {
    if (targetType === 'user' || targetType === 'office') return 1;

    if (targetType === 'all') {
      const [users, offices] = await Promise.all([
        supabase.from('Users').select('id', { count: 'exact', head: true }),
        supabase.from('Offices').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      if (users.error || offices.error) return null;
      return (users.count || 0) + (offices.count || 0);
    }

    const table = targetType === 'all_users' ? 'Users' : 'Offices';
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (targetType === 'all_offices') query = query.eq('is_active', true);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count || 0;
  },

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    readStatus?: '' | 'read' | 'unread';
  }): Promise<{ data: NotificationRow[]; count: number }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('يجب تسجيل الدخول كأدمن لعرض سجل الإشعارات');

    const searchParams = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 10),
    });

    const search = sanitizeSearch(params?.search);
    if (search) searchParams.set('search', search);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.readStatus) searchParams.set('readStatus', params.readStatus);

    const response = await fetch(`/api/notifications/history?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'تعذر تحميل سجل الإشعارات');
    }

    return {
      data: result.data || [],
      count: result.count || 0,
    };
  },

  async send(payload: SendAdminNotificationPayload): Promise<SendAdminNotificationResult> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('يجب تسجيل الدخول كأدمن قبل إرسال الإشعار');

    const { data, error } = await supabase.functions.invoke<SendAdminNotificationResult>('send-admin-notification', {
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      let message = error.message || 'تعذر إرسال الإشعار';
      const context = 'context' in error ? error.context : null;
      if (context instanceof Response) {
        try {
          const body = await context.json();
          message = body.message || message;
        } catch {
          message = context.statusText || message;
        }
      }
      throw new Error(message);
    }

    if (!data) throw new Error('لم يرجع السيرفر نتيجة صالحة');
    if (!data.success) throw new Error(data.message || 'تعذر إرسال الإشعار');
    return data;
  },
};
