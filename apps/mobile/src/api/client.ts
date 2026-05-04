import axios from 'axios';
import Constants from 'expo-constants';
import { useAuth } from '../auth/store';

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000';

export const api = axios.create({ baseURL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      const ok = await useAuth.getState().tryRefresh();
      if (ok && error.config) {
        const token = useAuth.getState().accessToken;
        error.config.headers.Authorization = `Bearer ${token}`;
        return api.request(error.config);
      }
      useAuth.getState().logout();
    }
    return Promise.reject(error);
  },
);
