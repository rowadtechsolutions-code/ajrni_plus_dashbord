export interface User {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
}

export interface Country {
  id: string;
  created_at: string;
  name_ar: string;
  name_en: string;
  code: string;
  phone_code: string;
  currency_code: string;
  flag_emoji: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  cities?: City[];
}

export interface City {
  id: string;
  created_at: string;
  country_id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

export interface Office {
  id: string;
  created_at: string;
  office_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
  country_id?: string;
  city_id?: string;
  is_active: boolean;
  bio: string;
  image: string;
  cover: string;
  commercial_registration_number: string;
  cars?: Car[];
}

export interface Car {
  id: string;
  created_at: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  plate_number: string;
  rental_type: string;
  status: 'available' | 'rented' | 'maintenance';
  is_active: boolean;
  office_id: string;
  owner_id: string;
  image: string;
  price: string;
  images: string[];
  office?: Office;
}

export interface Favorite {
  id: string;
  user_id: string;
  car_id: string;
  created_at: string;
  user?: User;
  car?: Car;
}

export interface BookingRequest {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  country: string;
  city: string;
  car_type: string;
  brand: string;
  model: string;
  pickup_date: string;
  return_date: string;
  budget_per_day: number;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  offices?: BookingRequestOffice[];
}

export interface BookingRequestOffice {
  id: string;
  request_id: string;
  office_id: string;
  status: 'sent' | 'viewed';
  is_read: boolean;
  created_at: string;
  office?: Office;
}

export interface BookingOffer {
  id: string;
  request_id: string;
  office_id: string;
  car_name: string;
  car_model: string;
  price_per_day: number;
  total_price: number;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  request?: BookingRequest;
  office?: Office;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  totalPages: number;
  currentPage: number;
}

export interface Banner {
  id: string;
  created_at: string;
  title: string;
  image_url: string;
  office_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  approved_by: string | null;
  approved_at: string | null;
  office?: Office;
}

export interface DuplicateOfficeInfo {
  id: string;
  office_name: string;
  phone_number: string;
  commercial_registration_number: string;
  is_active: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

export type SortDirection = 'asc' | 'desc';

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: string;
}

export type Locale = 'ar' | 'en';

export interface Admin {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'admin';
  is_active: boolean;
  last_login: string | null;
}
