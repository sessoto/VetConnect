import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';
import type { Me } from '@vetconnect/shared';

const KEY_ACCESS = 'vc.accessToken';
const KEY_REFRESH = 'vc.refreshToken';
const KEY_USER = 'vc.user';

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000';

const raw = axios.create({ baseURL, timeout: 15_000 });

interface AuthState {
  ready: boolean;
  user: Me | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registerClinic: (input: {
    clinicName: string;
    adminName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
}

async function persistTokens(access: string, refresh: string, user: Me) {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
    SecureStore.setItemAsync(KEY_USER, JSON.stringify(user)),
  ]);
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.deleteItemAsync(KEY_USER),
  ]);
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  user: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    const [access, refresh, userJson] = await Promise.all([
      SecureStore.getItemAsync(KEY_ACCESS),
      SecureStore.getItemAsync(KEY_REFRESH),
      SecureStore.getItemAsync(KEY_USER),
    ]);
    set({
      ready: true,
      accessToken: access,
      refreshToken: refresh,
      user: userJson ? (JSON.parse(userJson) as Me) : null,
    });
  },

  login: async (email, password) => {
    const { data } = await raw.post('/auth/login', { email, password });
    await persistTokens(data.accessToken, data.refreshToken, data.user);
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
  },

  registerClinic: async (input) => {
    const { data } = await raw.post('/auth/register-clinic', input);
    await persistTokens(data.accessToken, data.refreshToken, data.user);
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
  },

  logout: async () => {
    const refresh = get().refreshToken;
    const access = get().accessToken;
    try {
      if (refresh && access) {
        await raw.post(
          '/auth/logout',
          { refreshToken: refresh },
          { headers: { Authorization: `Bearer ${access}` } },
        );
      }
    } catch {
      // best effort
    }
    await clearTokens();
    set({ accessToken: null, refreshToken: null, user: null });
  },

  tryRefresh: async () => {
    const refresh = get().refreshToken;
    if (!refresh) return false;
    try {
      const { data } = await raw.post('/auth/refresh', { refreshToken: refresh });
      await SecureStore.setItemAsync(KEY_ACCESS, data.accessToken);
      await SecureStore.setItemAsync(KEY_REFRESH, data.refreshToken);
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      return false;
    }
  },
}));
