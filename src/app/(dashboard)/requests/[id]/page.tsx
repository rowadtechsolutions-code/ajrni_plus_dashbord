'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n/provider';
import { bookingService } from '@/services/booking.service';
import { Badge } from '@/components/ui/Badge';
import { FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';

const statusColors: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning', accepted: 'success', rejected: 'error',
};

export default function RequestDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { data: request, isLoading } = useQuery({
    queryKey: ['request', params.id],
    queryFn: () => bookingService.getRequestById(params.id as string),
    enabled: !!params.id,
  });

  const { data: offices } = useQuery({
    queryKey: ['request-offices', params.id],
    queryFn: () => bookingService.listRequestOffices(params.id as string),
    enabled: !!params.id,
  });

  if (isLoading) return <div className="text-gray-400">{t.common.loading}</div>;
  if (!request) return <div className="text-gray-400">{t.common.noData}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white">
        <FiArrowLeft size={18} /> {t.common.back}
      </button>
      <h1 className="text-2xl font-bold text-white">{t.requests.requestDetails}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-gray-500">{t.requests.fullName}</label>
            <p className="text-white">{request.full_name}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.phone}</label>
            <p className="text-white">{request.phone_number}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.country}</label>
            <p className="text-white">{request.country}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.city}</label>
            <p className="text-white">{request.city}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.carType}</label>
            <p className="text-white">{request.car_type}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.brand}</label>
            <p className="text-white">{request.brand}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.model}</label>
            <p className="text-white">{request.model}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.pickupDate}</label>
            <p className="text-white">{request.pickup_date ? format(new Date(request.pickup_date), 'yyyy-MM-dd') : '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.returnDate}</label>
            <p className="text-white">{request.return_date ? format(new Date(request.return_date), 'yyyy-MM-dd') : '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.budgetPerDay}</label>
            <p className="text-white">{request.budget_per_day}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.requests.status}</label>
            <Badge variant={statusColors[request.status]}>{t.requests[request.status as keyof typeof t.requests]}</Badge>
          </div>
          {request.notes && (
            <div className="col-span-2">
              <label className="text-xs text-gray-500">{t.requests.notes}</label>
              <p className="text-white">{request.notes}</p>
            </div>
          )}
        </div>
      </div>

      {offices && offices.length > 0 && (
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">{t.requests.assignedOffices}</h3>
          <div className="space-y-2">
            {offices.map((off) => (
              <div key={off.id} className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                <span className="text-sm text-gray-300">{off.office_id}</span>
                <Badge variant={off.is_read ? 'success' : 'warning'}>{off.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
