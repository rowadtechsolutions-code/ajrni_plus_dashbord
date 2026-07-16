import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type TargetType = 'user' | 'office' | 'all_users' | 'all_offices' | 'all';

type NotificationPayload = {
  target_type: TargetType;
  target_id?: string;
  title: string;
  body: string;
  type?: string;
  reference_id?: string;
  data?: Record<string, unknown>;
  saveToHistory?: boolean;
};

type DeviceRow = {
  id: string;
  user_id: string;
  fcm_token: string;
};

type InsertedNotification = {
  id: string;
  user_id: string;
};

type NotificationInsertRow = {
  user_id: string;
  title: string;
  body: string;
  type: string;
  reference_id: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedTargets = new Set<TargetType>(['user', 'office', 'all_users', 'all_offices', 'all']);
const allowedTypes = new Set([
  'general',
  'request_created',
  'request_accepted',
  'request_rejected',
  'request_cancelled',
  'request_completed',
  'new_customer_request',
  'car_approved',
  'car_rejected',
  'office_approved',
  'promotion',
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع') {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function isForeignKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  const message = getErrorMessage(error, '');
  return code === '23503' || message.toLowerCase().includes('foreign key');
}

async function insertNotificationRows(
  supabase: ReturnType<typeof createClient>,
  rows: NotificationInsertRow[],
) {
  const inserted: InsertedNotification[] = [];
  let skipped = 0;

  for (const batch of chunk(rows, 500)) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(batch)
      .select('id,user_id');

    if (!error) {
      inserted.push(...((data || []) as InsertedNotification[]));
      continue;
    }

    if (!isForeignKeyError(error)) {
      throw new Error(getErrorMessage(error, 'تعذر حفظ الإشعارات'));
    }

    for (const row of batch) {
      const { data: singleData, error: singleError } = await supabase
        .from('notifications')
        .insert(row)
        .select('id,user_id')
        .single();

      if (singleError) {
        skipped += 1;
      } else if (singleData) {
        inserted.push(singleData as InsertedNotification);
      }
    }
  }

  return { inserted, skipped };
}

function validatePayload(payload: NotificationPayload) {
  const targetType = payload.target_type;
  if (!allowedTargets.has(targetType)) throw new Error('target_type غير صالح');
  if ((targetType === 'user' || targetType === 'office') && (!payload.target_id || !uuidPattern.test(payload.target_id))) {
    throw new Error('يجب اختيار مستلم صالح');
  }
  if (!payload.title?.trim()) throw new Error('عنوان الإشعار مطلوب');
  if (payload.title.trim().length > 100) throw new Error('عنوان الإشعار طويل جدًا');
  if (!payload.body?.trim()) throw new Error('نص الإشعار مطلوب');
  if (payload.body.trim().length > 500) throw new Error('نص الإشعار طويل جدًا');
  if (payload.reference_id && !uuidPattern.test(payload.reference_id)) throw new Error('reference_id غير صالح');
  if (payload.type && !allowedTypes.has(payload.type)) throw new Error('نوع الإشعار غير صالح');
  if (payload.data && (Array.isArray(payload.data) || typeof payload.data !== 'object')) throw new Error('data يجب أن تكون JSON object');
}

function toBase64Url(input: ArrayBuffer | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function privateKeyToArrayBuffer(pem: string) {
  const clean = pem
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGoogleAccessToken() {
  const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = getEnv('FIREBASE_PRIVATE_KEY');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsignedJwt = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsignedJwt));
  const assertion = `${unsignedJwt}.${toBase64Url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error('تعذر إنشاء Firebase access token');
  return json.access_token as string;
}

function toFcmData(payload: NotificationPayload, notificationId?: string) {
  const data: Record<string, string> = {
    type: payload.type || 'general',
  };
  if (payload.reference_id) data.reference_id = payload.reference_id;
  if (notificationId) data.notification_id = notificationId;
  for (const [key, value] of Object.entries(payload.data || {})) {
    if (value === undefined || value === null) continue;
    data[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return data;
}

function isInvalidTokenResponse(status: number, body: string) {
  if (status === 404 && body.includes('requested entity was not found')) return true;
  return body.includes('UNREGISTERED') || body.includes('invalid registration token');
}

async function sendFcmMessage(token: string, payload: NotificationPayload, accessToken: string, notificationId?: string) {
  const projectId = getEnv('FIREBASE_PROJECT_ID');
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title.trim(),
            body: payload.body.trim(),
          },
          data: toFcmData(payload, notificationId),
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'ajrni_high_importance_channel',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        },
      }),
    });

    if (res.ok) return { ok: true, invalidToken: false };
    const text = await res.text();
    return { ok: false, invalidToken: isInvalidTokenResponse(res.status, text) };
  } catch {
    return { ok: false, invalidToken: false };
  }
}

async function fetchIds(
  supabase: ReturnType<typeof createClient>,
  table: 'Users' | 'Offices',
  onlyActiveOffices = false,
) {
  const ids: string[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select('id').range(from, from + pageSize - 1);
    if (table === 'Offices' && onlyActiveOffices) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    ids.push(...(data || []).map((row: { id: string }) => row.id));
    if (!data || data.length < pageSize) break;
  }
  return ids;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, message: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return jsonResponse({ success: false, message: 'المستخدم غير مصرح له' }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ success: false, message: 'المستخدم غير مصرح له' }, 401);

    const { data: admin, error: adminError } = await supabase
      .from('Admins')
      .select('id,is_active')
      .eq('id', userData.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) throw new Error(getErrorMessage(adminError, 'تعذر التحقق من صلاحية الأدمن'));
    if (!admin) return jsonResponse({ success: false, message: 'المستخدم غير مصرح له' }, 403);

    const payload = (await req.json()) as NotificationPayload;
    validatePayload(payload);

    let targetUserIds: string[] = [];
    if (payload.target_type === 'user') {
      const { data } = await supabase.from('Users').select('id').eq('id', payload.target_id).maybeSingle();
      if (!data) throw new Error('المستخدم غير موجود');
      targetUserIds = [payload.target_id!];
    } else if (payload.target_type === 'office') {
      const { data } = await supabase.from('Offices').select('id').eq('id', payload.target_id).maybeSingle();
      if (!data) throw new Error('المكتب غير موجود');
      targetUserIds = [payload.target_id!];
    } else if (payload.target_type === 'all_users') {
      targetUserIds = await fetchIds(supabase, 'Users');
    } else if (payload.target_type === 'all_offices') {
      targetUserIds = await fetchIds(supabase, 'Offices', true);
    } else {
      const [users, offices] = await Promise.all([
        fetchIds(supabase, 'Users'),
        fetchIds(supabase, 'Offices', true),
      ]);
      targetUserIds = [...users, ...offices];
    }

    targetUserIds = unique(targetUserIds);
    if (!targetUserIds.length) throw new Error('لا يوجد مستلمون مطابقون');

    console.info('send-admin-notification targets selected', {
      target_type: payload.target_type,
      targeted_users: targetUserIds.length,
    });

    const saveToHistory = payload.saveToHistory === true;

    let insertedNotifications: InsertedNotification[] = [];
    let skippedNotifications = 0;
    let historySavedWarning: string | undefined;

    const savedUserIds = insertedNotifications.length
      ? unique(insertedNotifications.map((row) => row.user_id))
      : targetUserIds;

    const notificationByUserId = new Map(
      insertedNotifications.map((row) => [row.user_id, row.id]),
    );

    const devices: DeviceRow[] = [];
    for (const ids of chunk(savedUserIds, 500)) {
      const { data, error } = await supabase
        .from('user_devices')
        .select('id,user_id,fcm_token')
        .eq('is_active', true)
        .in('user_id', ids);
      if (error) throw new Error(getErrorMessage(error, 'تعذر جلب توكنات الأجهزة'));
      devices.push(...((data || []) as DeviceRow[]));
    }

    const devicesByToken = new Map<string, DeviceRow>();
    for (const device of devices) {
      if (!devicesByToken.has(device.fcm_token)) devicesByToken.set(device.fcm_token, device);
    }

    const uniqueDevices = Array.from(devicesByToken.values());
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    console.info('send-admin-notification devices selected', {
      targeted_tokens: uniqueDevices.length,
    });

    if (uniqueDevices.length) {
      const accessToken = await createGoogleAccessToken();
      for (const batch of chunk(uniqueDevices, 10)) {
        const results = await Promise.all(
          batch.map((device) =>
            sendFcmMessage(device.fcm_token, payload, accessToken, notificationByUserId.get(device.user_id)),
          ),
        );
        results.forEach((result, index) => {
          if (result.ok) {
            sent += 1;
          } else {
            failed += 1;
            if (result.invalidToken) invalidTokens.push(batch[index].fcm_token);
          }
        });
      }
    }

    for (const tokens of chunk(unique(invalidTokens), 100)) {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('fcm_token', tokens);
      if (error) throw new Error(getErrorMessage(error, 'تعذر تعطيل التوكنات غير الصالحة'));
    }

    if (saveToHistory && failed === 0) {
      try {
        const notificationRows: NotificationInsertRow[] = targetUserIds.map((userId) => ({
          user_id: userId,
          title: payload.title.trim(),
          body: payload.body.trim(),
          type: payload.type || 'general',
          reference_id: payload.reference_id || null,
          data: payload.data || {},
          is_read: false,
        }));

        const result = await insertNotificationRows(supabase, notificationRows);
        insertedNotifications = result.inserted;
        skippedNotifications = result.skipped;

        if (!insertedNotifications.length) {
          historySavedWarning = 'تعذر حفظ الإشعار في السجل';
        }
      } catch (error) {
        historySavedWarning = 'تعذر حفظ الإشعار في السجل';
      }
    }

    const responseBody: Record<string, unknown> = {
      success: true,
      targeted_users: targetUserIds.length,
      saved_notifications: insertedNotifications.length,
      skipped_notifications: skippedNotifications,
      targeted_tokens: uniqueDevices.length,
      sent,
      failed,
      invalid_tokens: unique(invalidTokens).length,
      message: uniqueDevices.length ? 'تم إرسال الإشعار' : 'تم حفظ الإشعار، ولا توجد أجهزة فعالة',
    };

    if (historySavedWarning) {
      responseBody.history_save_error = historySavedWarning;
    }

    return jsonResponse(responseBody);
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ success: false, message }, 400);
  }
});
