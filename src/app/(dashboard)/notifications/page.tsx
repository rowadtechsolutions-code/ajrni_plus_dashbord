'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FiAlertTriangle,
  FiBell,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiSearch,
  FiSend,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/hooks/useToast';
import {
  notificationsService,
  type AdminNotificationType,
  type NotificationRow,
  type NotificationTargetType,
  type SendAdminNotificationPayload,
} from '@/services/notifications.service';
import type { Office, User } from '@/types';

type RecipientType = 'user' | 'office';
type SelectedRecipient = {
  id: string;
  label: string;
  detail: string;
};

const targetOptions: { value: NotificationTargetType; label: string }[] = [
  { value: 'user', label: 'مستخدم محدد' },
  { value: 'office', label: 'مكتب محدد' },
  { value: 'all_users', label: 'جميع المستخدمين' },
  { value: 'all_offices', label: 'جميع المكاتب المفعلة' },
  { value: 'all', label: 'الجميع' },
];

const notificationTypes: { value: AdminNotificationType; label: string }[] = [
  { value: 'general', label: 'عام' },
  { value: 'request_created', label: 'تم إنشاء طلب' },
  { value: 'request_accepted', label: 'قبول طلب' },
  { value: 'request_rejected', label: 'رفض طلب' },
  { value: 'request_cancelled', label: 'إلغاء طلب' },
  { value: 'request_completed', label: 'اكتمال طلب' },
  { value: 'new_customer_request', label: 'طلب عميل جديد' },
  { value: 'car_approved', label: 'اعتماد سيارة' },
  { value: 'car_rejected', label: 'رفض سيارة' },
  { value: 'office_approved', label: 'اعتماد مكتب' },
  { value: 'promotion', label: 'عرض ترويجي' },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emptyForm = {
  target_type: 'user' as NotificationTargetType,
  target_id: '',
  title: '',
  body: '',
  type: 'general' as AdminNotificationType,
  reference_id: '',
  data: '',
};

function useDebouncedValue(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function optionFromUser(user: User): SelectedRecipient {
  return {
    id: user.id,
    label: user.full_name || user.email || user.phone_number || user.id.slice(0, 8),
    detail: [user.email, user.phone_number].filter(Boolean).join(' - '),
  };
}

function optionFromOffice(office: Office): SelectedRecipient {
  return {
    id: office.id,
    label: office.office_name || office.email || office.phone_number || office.id.slice(0, 8),
    detail: [office.email, office.phone_number].filter(Boolean).join(' - '),
  };
}

function RecipientDropdown({
  type,
  selected,
  error,
  onSelect,
  onClear,
}: {
  type: RecipientType;
  selected: SelectedRecipient | null;
  error?: string;
  onSelect: (recipient: SelectedRecipient) => void;
  onClear: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const isUser = type === 'user';

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const query = useQuery<Array<User | Office>>({
    queryKey: ['notification-recipient-options', type, debouncedSearch],
    queryFn: async () =>
      isUser
        ? notificationsService.searchUsers(debouncedSearch)
        : notificationsService.searchOffices(debouncedSearch),
    enabled: open,
  });

  const rows = query.data || [];

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm text-gray-400">
        {isUser ? 'المستخدم' : 'المكتب'} *
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`flex min-h-11 flex-1 items-center justify-between rounded-xl border bg-gray-800 px-4 py-2.5 text-start text-sm outline-none transition-colors ${
            error ? 'border-red-500' : open ? 'border-blue-600' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <span className="min-w-0">
            {selected ? (
              <>
                <span className="block truncate font-medium text-white">{selected.label}</span>
                {selected.detail && <span className="block truncate text-xs text-gray-500">{selected.detail}</span>}
              </>
            ) : (
              <span className="text-gray-500">{isUser ? 'اختر مستخدمًا...' : 'اختر مكتبًا...'}</span>
            )}
          </span>
          <FiChevronDown className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} size={18} />
        </button>
        {selected && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-400 transition-colors hover:border-red-500 hover:text-red-400"
            aria-label="مسح الاختيار"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="border-b border-gray-800 p-3">
            <div className="relative">
              <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
                placeholder={isUser ? 'بحث بالاسم أو البريد أو الهاتف...' : 'بحث باسم المكتب أو البريد أو الهاتف...'}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 ps-10 pe-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-600"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {query.isLoading && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-gray-800/80" />
                ))}
              </div>
            )}

            {query.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                تعذر تحميل القائمة
              </div>
            )}

            {!query.isLoading && !query.isError && rows.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">لا توجد نتائج</div>
            )}

            {!query.isLoading && !query.isError && rows.map((row) => {
              const office = row as Office;
              const recipient = isUser ? optionFromUser(row as User) : optionFromOffice(office);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onSelect(recipient);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-gray-800"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-800 text-gray-400">
                    {!isUser && office.image ? (
                      <span
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${office.image})` }}
                        aria-label={recipient.label}
                      />
                    ) : isUser ? (
                      <FiUser size={18} />
                    ) : (
                      <FiBriefcase size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{recipient.label}</p>
                      {!isUser && (
                        <Badge variant={office.is_active ? 'success' : 'neutral'}>
                          {office.is_active ? 'مفعل' : 'غير مفعل'}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">{recipient.detail || '-'}</p>
                  </div>
                  {selected?.id === row.id && <FiCheck className="shrink-0 text-blue-500" size={18} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [form, setForm] = useState(emptyForm);
  const [selectedRecipient, setSelectedRecipient] = useState<SelectedRecipient | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('');
  const [readStatus, setReadStatus] = useState<'' | 'read' | 'unread'>('');
  const [historyPage, setHistoryPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const historyLimit = 10;

  const needsRecipient = form.target_type === 'user' || form.target_type === 'office';
  const isBulkTarget = form.target_type === 'all_users' || form.target_type === 'all_offices' || form.target_type === 'all';
  const debouncedHistorySearch = useDebouncedValue(historySearch);

  const historyQuery = useQuery({
    queryKey: ['notifications-history', historyPage, debouncedHistorySearch, historyType, readStatus],
    queryFn: () =>
      notificationsService.list({
        page: historyPage,
        limit: historyLimit,
        search: debouncedHistorySearch,
        type: historyType,
        readStatus,
      }),
  });

  const totalHistoryPages = Math.ceil((historyQuery.data?.count || 0) / historyLimit);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (needsRecipient && !form.target_id) nextErrors.target_id = 'يجب اختيار مستلم';
    if (!form.title.trim()) nextErrors.title = 'عنوان الإشعار مطلوب';
    if (form.title.trim().length > 100) nextErrors.title = 'العنوان يجب ألا يتجاوز 100 حرف';
    if (!form.body.trim()) nextErrors.body = 'نص الإشعار مطلوب';
    if (form.body.trim().length > 500) nextErrors.body = 'النص يجب ألا يتجاوز 500 حرف';
    if (form.reference_id && !uuidPattern.test(form.reference_id)) nextErrors.reference_id = 'reference_id يجب أن يكون UUID صالح';
    if (form.data.trim()) {
      try {
        JSON.parse(form.data);
      } catch {
        nextErrors.data = 'بيانات JSON غير صالحة';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): SendAdminNotificationPayload => {
    const data = form.data.trim() ? JSON.parse(form.data) : {};
    const payload: SendAdminNotificationPayload = {
      target_type: form.target_type,
      title: form.title.trim(),
      body: form.body.trim(),
      type: form.type,
      data,
    };
    if (needsRecipient) payload.target_id = form.target_id;
    if (form.reference_id.trim()) payload.reference_id = form.reference_id.trim();
    return payload;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedRecipient(null);
    setErrors({});
  };

  const sendMutation = useMutation({
    mutationFn: (payload: SendAdminNotificationPayload) => notificationsService.send(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-history'] });
      const message =
        result.targeted_tokens === 0
          ? 'تم حفظ الإشعار، لكن لا توجد أجهزة فعالة لإرسال Push'
          : result.failed > 0
            ? `تم حفظ الإشعار، وفشل إرسال Push لبعض الأجهزة (${result.failed})`
            : 'تم إرسال الإشعار بنجاح';
      showToast(message, result.failed > 0 ? 'info' : 'success');
      resetForm();
      setConfirmOpen(false);
      setActiveTab('history');
    },
    onError: (error: Error) => {
      showToast(error.message || 'تعذر إرسال الإشعار', 'error');
      setConfirmOpen(false);
    },
  });

  const prepareSubmit = async () => {
    if (!validate()) return;
    if (!isBulkTarget) {
      sendMutation.mutate(buildPayload());
      return;
    }
    setTargetCount(await notificationsService.countTargets(form.target_type));
    setConfirmOpen(true);
  };

  const historyColumns = useMemo(() => [
    { key: 'title', label: 'العنوان' },
    {
      key: 'body',
      label: 'النص',
      render: (row: NotificationRow) => <span className="block max-w-xs truncate">{row.body}</span>,
    },
    {
      key: 'type',
      label: 'النوع',
      render: (row: NotificationRow) => notificationTypes.find((item) => item.value === row.type)?.label || row.type,
    },
    {
      key: 'recipient_name',
      label: 'المستلم',
      render: (row: NotificationRow) => row.recipient_name || row.user_id.slice(0, 8),
    },
    {
      key: 'created_at',
      label: 'تاريخ الإرسال',
      render: (row: NotificationRow) => format(new Date(row.created_at), 'yyyy-MM-dd HH:mm'),
    },
    {
      key: 'is_read',
      label: 'حالة القراءة',
      render: (row: NotificationRow) => <Badge variant={row.is_read ? 'success' : 'warning'}>{row.is_read ? 'مقروء' : 'غير مقروء'}</Badge>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الإشعارات</h1>
          <p className="mt-1 text-sm text-gray-500">إرسال إشعارات Push وحفظ السجل داخل التطبيق</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-500">
          <FiBell size={22} />
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'send' ? 'border-b-2 border-blue-600 text-blue-500' : 'text-gray-400 hover:text-white'}`}
        >
          إرسال إشعار
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-500' : 'text-gray-400 hover:text-white'}`}
        >
          سجل الإشعارات
        </button>
      </div>

      {activeTab === 'send' ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">المستلم ونوع الإشعار</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">نوع المستلمين *</label>
                <select
                  value={form.target_type}
                  onChange={(event) => {
                    setForm({ ...form, target_type: event.target.value as NotificationTargetType, target_id: '' });
                    setSelectedRecipient(null);
                    setErrors({});
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600"
                >
                  {targetOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">نوع الإشعار *</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as AdminNotificationType })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600"
                >
                  {notificationTypes.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {needsRecipient && (
              <div className="mt-4 max-w-2xl">
                <RecipientDropdown
                  key={form.target_type}
                  type={form.target_type as RecipientType}
                  selected={selectedRecipient}
                  error={errors.target_id}
                  onSelect={(recipient) => {
                    setSelectedRecipient(recipient);
                    setForm({ ...form, target_id: recipient.id });
                    setErrors((current) => ({ ...current, target_id: '' }));
                  }}
                  onClear={() => {
                    setSelectedRecipient(null);
                    setForm({ ...form, target_id: '' });
                  }}
                />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">محتوى الإشعار</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-sm text-gray-400">عنوان الإشعار *</label>
                  <span className="text-xs text-gray-500">{form.title.length}/100</span>
                </div>
                <input
                  value={form.title}
                  maxLength={100}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className={`w-full rounded-xl border ${errors.title ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">reference_id اختياري</label>
                <input
                  value={form.reference_id}
                  onChange={(event) => setForm({ ...form, reference_id: event.target.value })}
                  className={`w-full rounded-xl border ${errors.reference_id ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600`}
                  placeholder="UUID"
                  dir="ltr"
                />
                {errors.reference_id && <p className="mt-1 text-xs text-red-400">{errors.reference_id}</p>}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm text-gray-400">نص الإشعار *</label>
                <span className="text-xs text-gray-500">{form.body.length}/500</span>
              </div>
              <textarea
                value={form.body}
                maxLength={500}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                className={`min-h-28 w-full resize-y rounded-xl border ${errors.body ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-600`}
              />
              {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body}</p>}
            </div>

            <details className="mt-4 rounded-xl border border-gray-800 bg-gray-950/40">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-300">بيانات JSON اختيارية</summary>
              <div className="border-t border-gray-800 p-4">
                <textarea
                  dir="ltr"
                  value={form.data}
                  onChange={(event) => setForm({ ...form, data: event.target.value })}
                  placeholder={'{\n  "screen": "car_details"\n}'}
                  className={`min-h-28 w-full resize-y rounded-xl border ${errors.data ? 'border-red-500' : 'border-gray-700'} bg-gray-800 px-4 py-2.5 font-mono text-sm text-white outline-none transition-colors focus:border-blue-600`}
                />
                {errors.data && <p className="mt-1 text-xs text-red-400">{errors.data}</p>}
              </div>
            </details>
          </section>

          <div className="flex justify-end">
            <button
              onClick={prepareSubmit}
              disabled={sendMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSend size={18} />
              {sendMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="max-w-sm flex-1">
                <SearchInput
                  value={historySearch}
                  onChange={(value) => {
                    setHistorySearch(value);
                    setHistoryPage(1);
                  }}
                  placeholder="بحث في العنوان أو النص..."
                />
              </div>
              <select
                value={historyType}
                onChange={(event) => {
                  setHistoryType(event.target.value);
                  setHistoryPage(1);
                }}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 outline-none transition-colors focus:border-blue-600"
              >
                <option value="">كل الأنواع</option>
                {notificationTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select
                value={readStatus}
                onChange={(event) => {
                  setReadStatus(event.target.value as '' | 'read' | 'unread');
                  setHistoryPage(1);
                }}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 outline-none transition-colors focus:border-blue-600"
              >
                <option value="">كل حالات القراءة</option>
                <option value="read">مقروء</option>
                <option value="unread">غير مقروء</option>
              </select>
            </div>
          </div>

          {historyQuery.isError ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <FiAlertTriangle size={20} />
              <span>{historyQuery.error instanceof Error ? historyQuery.error.message : 'تعذر تحميل سجل الإشعارات'}</span>
            </div>
          ) : (
            <Table
              columns={historyColumns}
              data={historyQuery.data?.data || []}
              loading={historyQuery.isLoading}
              emptyTitle="لا توجد إشعارات"
              emptyDescription="ستظهر هنا الإشعارات التي تم حفظها أو إرسالها."
              pagination={{
                currentPage: historyPage,
                totalPages: totalHistoryPages,
                onPageChange: setHistoryPage,
              }}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => sendMutation.mutate(buildPayload())}
        title="تأكيد الإرسال الجماعي"
        message={`سيتم إرسال Push فعلي إلى ${targetOptions.find((item) => item.value === form.target_type)?.label}. العدد المتوقع: ${targetCount ?? 'يحدده السيرفر بعد إزالة التكرار'}. العنوان: ${form.title}`}
        confirmText="إرسال الآن"
        variant="warning"
        loading={sendMutation.isPending}
      />
    </div>
  );
}
