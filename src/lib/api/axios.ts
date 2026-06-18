import axios from 'axios';
import { getAuthToken } from '@/lib/supabase/client';

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const enhanced = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status || 500,
      details: error.response?.data || null,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    };
    return Promise.reject(enhanced);
  }
);

export default apiClient;
