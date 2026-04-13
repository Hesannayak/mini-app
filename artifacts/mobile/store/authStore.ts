import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const webStorage = {
  set: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  getString: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  delete: (key: string) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  phone: string | null;
  hydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setPhone: (phone: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  phone: null,
  hydrated: false,

  setTokens: (accessToken, refreshToken) => {
    if (Platform.OS === 'web') {
      webStorage.set('accessToken', accessToken);
      webStorage.set('refreshToken', refreshToken);
    } else {
      AsyncStorage.setItem('accessToken', accessToken);
      AsyncStorage.setItem('refreshToken', refreshToken);
    }
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setPhone: (phone) => {
    if (Platform.OS === 'web') {
      webStorage.set('phone', phone);
    } else {
      AsyncStorage.setItem('phone', phone);
    }
    set({ phone });
  },

  logout: () => {
    if (Platform.OS === 'web') {
      webStorage.delete('accessToken');
      webStorage.delete('refreshToken');
      webStorage.delete('phone');
    } else {
      AsyncStorage.removeItem('accessToken');
      AsyncStorage.removeItem('refreshToken');
      AsyncStorage.removeItem('phone');
    }
    set({ accessToken: null, refreshToken: null, phone: null, isAuthenticated: false });
  },

  hydrate: async () => {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let phone: string | null = null;

    if (Platform.OS === 'web') {
      accessToken = webStorage.getString('accessToken');
      refreshToken = webStorage.getString('refreshToken');
      phone = webStorage.getString('phone');
    } else {
      accessToken = await AsyncStorage.getItem('accessToken');
      refreshToken = await AsyncStorage.getItem('refreshToken');
      phone = await AsyncStorage.getItem('phone');
    }

    set({ accessToken, refreshToken, phone, isAuthenticated: !!accessToken, hydrated: true });
  },
}));
