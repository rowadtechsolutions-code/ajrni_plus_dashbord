import { z } from 'zod';

export const carStep1Schema = z.object({
  name: z.string().min(1, 'اسم السيارة مطلوب'),
  brand: z.string().min(1, 'العلامة التجارية مطلوبة'),
  model: z.string().min(1, 'الموديل مطلوب'),
});

export const carStep2Schema = z.object({
  year: z.string().min(1, 'سنة الصنع مطلوبة'),
  color: z.string().optional(),
  transmission: z.string().min(1, 'ناقل الحركة مطلوب'),
  fuel_type: z.string().min(1, 'نوع الوقود مطلوب'),
  seats: z.string().min(1, 'عدد المقاعد مطلوب'),
  plate_number: z.string().optional(),
});

export const carStep3Schema = z.object({
  rental_type: z.enum(['Daily', 'Monthly']),
  price: z.string().min(1, 'السعر مطلوب'),
  status: z.enum(['available', 'rented', 'maintenance']),
});

export type CarStep1Data = z.infer<typeof carStep1Schema>;
export type CarStep2Data = z.infer<typeof carStep2Schema>;
export type CarStep3Data = z.infer<typeof carStep3Schema>;
