export interface User {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
}

export interface Office {
  id: string;
  created_at: string;
  office_name: string;
  email: string;
  phone_number: string;
  country: string;
  city: string;
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

export interface ApiError {
  message: string;
  status: number;
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
