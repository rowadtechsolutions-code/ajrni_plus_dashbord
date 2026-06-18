'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@/i18n/provider';
import { carsService } from '@/services/cars.service';
import { officesService } from '@/services/offices.service';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { brands, brandModels } from '@/lib/brands';
import { carStep1Schema, carStep2Schema, carStep3Schema, type CarStep1Data, type CarStep2Data, type CarStep3Data } from '@/lib/validations/car';
import { FiArrowLeft, FiCheck, FiUpload, FiX, FiChevronLeft, FiChevronRight, FiImage, FiSettings, FiDollarSign, FiHome } from 'react-icons/fi';
import { BsCarFront } from 'react-icons/bs';

const steps = [
  { icon: BsCarFront, label: { ar: 'السيارة', en: 'Car' } },
  { icon: FiSettings, label: { ar: 'المواصفات', en: 'Specs' } },
  { icon: FiDollarSign, label: { ar: 'السعر', en: 'Pricing' } },
  { icon: FiImage, label: { ar: 'الصور', en: 'Images' } },
  { icon: FiHome, label: { ar: 'المكتب', en: 'Office' } },
];

export default function NewCarPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [tempCarId] = useState(() => crypto.randomUUID());
  const [officeId, setOfficeId] = useState('');
  const [officeError, setOfficeError] = useState('');
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const step1 = useForm<CarStep1Data>({
    resolver: zodResolver(carStep1Schema),
    defaultValues: { name: '', brand: '', model: '' },
  });

  const step2 = useForm<CarStep2Data>({
    resolver: zodResolver(carStep2Schema),
    defaultValues: { year: '', color: '', transmission: 'Automatic', fuel_type: 'Gasoline', seats: '5', plate_number: '' },
  });

  const step3 = useForm<CarStep3Data>({
    resolver: zodResolver(carStep3Schema),
    defaultValues: { rental_type: 'Daily' as const, price: '', status: 'available' },
  });

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => officesService.list({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const s1 = step1.getValues();
      const s2 = step2.getValues();
      const s3 = step3.getValues();

      const imageUrls: string[] = [];
      for (let i = 0; i < 3; i++) {
        const file = imageFiles[i];
        if (file) {
          const ext = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const path = `${tempCarId}/${fileName}`;
          const { data, error } = await supabase.storage.from('cars').upload(path, file, { upsert: true });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('cars').getPublicUrl(data.path);
          imageUrls.push(publicUrl);
        }
      }

      return carsService.create({
        id: tempCarId,
        name: s1.name,
        brand: s1.brand,
        model: s1.model,
        year: Number(s2.year),
        color: s2.color || '',
        transmission: s2.transmission,
        fuel_type: s2.fuel_type,
        seats: Number(s2.seats),
        plate_number: s2.plate_number || '',
        rental_type: s3.rental_type,
        price: s3.price,
        status: s3.status,
        is_active: true,
        images: imageUrls,
        image: imageUrls[0] || '',
        office_id: officeId,
        owner_id: officeId,
      });
    },
    onSuccess: () => { showToast(t.cars.addCar + ' ' + t.common.success, 'success'); router.push('/cars'); },
    onError: () => showToast(t.common.error, 'error'),
  });

  const validateStep = async () => {
    if (step === 0) return step1.trigger();
    if (step === 1) return step2.trigger();
    if (step === 2) return step3.trigger();
    if (step === 4 && !officeId) { setOfficeError('الرجاء اختيار المكتب'); return false; }
    return true;
  };

  const next = async () => {
    const valid = await validateStep();
    if (valid) setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSave = () => {
    if (!officeId) { setOfficeError('الرجاء اختيار المكتب'); return; }
    setShowConfirm(true);
  };

  const handleImage = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    newFiles[index] = file;
    newPreviews[index] = URL.createObjectURL(file);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    newFiles[index] = null;
    newPreviews[index] = null;
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
  };

  const selectedBrand = step1.watch('brand');
  const rentalType = step3.watch('rental_type');

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white">
        <FiArrowLeft size={18} /> {t.common.back}
      </button>
      <h1 className="text-2xl font-bold text-white">{t.cars.addCar}</h1>

      <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'bg-green-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'}`}>
                {i < step ? <FiCheck className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={`hidden sm:inline text-xs font-medium ${i === step ? 'text-blue-400' : 'text-gray-500'}`}>
                {locale === 'en' ? s.label.en : s.label.ar}
              </span>
              {i < steps.length - 1 && <div className={`hidden sm:block w-8 h-0.5 mx-1 ${i < step ? 'bg-green-600' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t.cars.name} <span className="text-red-400">*</span></label>
              <input className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" placeholder={locale === 'en' ? 'e.g. Camry 2024' : 'مثال: كامري 2024'} {...step1.register('name')} />
              {step1.formState.errors.name && <p className="text-xs text-red-400 mt-1">{step1.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t.cars.brand} <span className="text-red-400">*</span></label>
              {selectedBrand && (() => {
                const b = brands.find(x => x.id === selectedBrand);
                return b ? (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-600/30">
                    <img src={b.logo} alt={b.label} className="w-6 h-6 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${b.label}&background=${b.color.slice(1)}&color=fff&size=24`; }} />
                    <span className="text-sm font-semibold text-blue-400">{b.label}</span>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {brands.map((b) => (
                  <button key={b.id} type="button" onClick={() => step1.setValue('brand', b.id, { shouldValidate: true })} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${selectedBrand === b.id ? 'border-blue-600 bg-blue-600/10 ring-2 ring-blue-600/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                    <img src={b.logo} alt={b.label} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${b.label}&background=${b.color.slice(1)}&color=fff&size=32`; }} />
                    <span className="text-[11px] font-medium text-gray-400 truncate w-full text-center">{b.label}</span>
                  </button>
                ))}
              </div>
              {step1.formState.errors.brand && <p className="text-xs text-red-400 mt-1">{step1.formState.errors.brand.message}</p>}
            </div>
            {selectedBrand && brandModels[selectedBrand] && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t.cars.model} <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {brandModels[selectedBrand].map((m) => (
                    <button key={m} type="button" onClick={() => step1.setValue('model', m, { shouldValidate: true })} className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${step1.watch('model') === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-blue-600'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                {step1.formState.errors.model && <p className="text-xs text-red-400 mt-1">{step1.formState.errors.model.message}</p>}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.year} <span className="text-red-400">*</span></label>
                <input type="number" className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" placeholder="2024" {...step2.register('year')} />
                {step2.formState.errors.year && <p className="text-xs text-red-400 mt-1">{step2.formState.errors.year.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.color}</label>
                <input className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" placeholder={locale === 'en' ? 'White' : 'أبيض'} {...step2.register('color')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.transmission} <span className="text-red-400">*</span></label>
                <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" {...step2.register('transmission')}>
                  <option value="Automatic">{locale === 'en' ? 'Automatic' : 'أوتوماتيك'}</option>
                  <option value="Manual">{locale === 'en' ? 'Manual' : 'يدوي'}</option>
                </select>
                {step2.formState.errors.transmission && <p className="text-xs text-red-400 mt-1">{step2.formState.errors.transmission.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.fuelType} <span className="text-red-400">*</span></label>
                <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" {...step2.register('fuel_type')}>
                  <option value="Gasoline">{locale === 'en' ? 'Gasoline' : 'بنزين'}</option>
                  <option value="Diesel">{locale === 'en' ? 'Diesel' : 'ديزل'}</option>
                  <option value="Electric">{locale === 'en' ? 'Electric' : 'كهرباء'}</option>
                  <option value="Hybrid">{locale === 'en' ? 'Hybrid' : 'هايبرد'}</option>
                </select>
                {step2.formState.errors.fuel_type && <p className="text-xs text-red-400 mt-1">{step2.formState.errors.fuel_type.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.seats} <span className="text-red-400">*</span></label>
                <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" {...step2.register('seats')}>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {step2.formState.errors.seats && <p className="text-xs text-red-400 mt-1">{step2.formState.errors.seats.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.cars.plateNumber}</label>
                <input className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" placeholder={locale === 'en' ? 'ABC 1234' : 'أ ب ج 1234'} {...step2.register('plate_number')} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-3">{t.cars.rentalType} <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {(['Daily', 'Monthly'] as const).map((rt) => (
                  <button key={rt} type="button" onClick={() => step3.setValue('rental_type', rt)} className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border transition-all ${rentalType === rt ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-blue-600'}`}>
                    {rt === 'Daily' ? (locale === 'en' ? 'Daily' : 'يومي') : (locale === 'en' ? 'Monthly' : 'شهري')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {rentalType === 'Daily' ? (locale === 'en' ? 'Price per Day' : 'السعر في اليوم') : (locale === 'en' ? 'Price per Month' : 'السعر في الشهر')} <span className="text-red-400">*</span>
              </label>
              <input type="number" className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all" placeholder="0" {...step3.register('price')} />
              {step3.formState.errors.price && <p className="text-xs text-red-400 mt-1">{step3.formState.errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t.cars.status} <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {(['available', 'rented', 'maintenance'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => step3.setValue('status', s)} className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium border transition-all ${step3.watch('status') === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-blue-600'}`}>
                    {s === 'available' ? (locale === 'en' ? 'Available' : 'متاح') : s === 'rented' ? (locale === 'en' ? 'Rented' : 'مستأجر') : (locale === 'en' ? 'Maintenance' : 'صيانة')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{locale === 'en' ? 'Car Images' : 'صور السيارة'} (3)</label>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    {imagePreviews[i] ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-700 group">
                        <img src={imagePreviews[i]!} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <FiX className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRefs.current[i]?.click()} className="w-full aspect-video flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/50 text-gray-500 hover:border-blue-600 hover:text-blue-400 transition-all cursor-pointer">
                        <FiUpload className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{locale === 'en' ? 'Image' : 'صورة'} {i + 1}</span>
                      </button>
                    )}
                    <input ref={(el) => { fileInputRefs.current[i] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(i, e)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{locale === 'en' ? 'Max 3 images' : 'الحد الأقصى 3 صور'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">{locale === 'en' ? 'Max 3 images' : 'الحد الأقصى 3 صور'}</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t.cars.office} <span className="text-red-400">*</span></label>
              <select value={officeId} onChange={(e) => { setOfficeId(e.target.value); setOfficeError(''); }} className={`w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-blue-600 transition-all ${officeError ? 'border-red-500' : 'border-gray-700'} bg-gray-800`}>
                <option value="">{locale === 'en' ? '-- Select Office --' : '-- اختر المكتب --'}</option>
                {officesData?.data?.map((off) => (
                  <option key={off.id} value={off.id}>{off.office_name} ({off.country}/{off.city})</option>
                ))}
              </select>
              {officeError && <p className="text-xs text-red-400 mt-1">{officeError}</p>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-gray-700 mt-6">
          {step > 0 ? (
            <button type="button" onClick={prev} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-700 transition-all">
              <FiChevronRight className="w-4 h-4" />
              {locale === 'en' ? 'Back' : 'السابق'}
            </button>
          ) : <div />}
          {step < 4 ? (
            <button type="button" onClick={next} className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all">
              {locale === 'en' ? 'Next' : 'التالي'}
              <FiChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSave} className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all">
              {t.common.save}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => createMutation.mutate()}
        title={t.cars.addCar}
        message="هل أنت متأكد من إضافة هذه السيارة؟"
        confirmText={t.common.save}
        variant="info"
        loading={createMutation.isPending}
      />
    </div>
  );
}
