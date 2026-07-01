import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@csnotes/theme_mode';

interface ThemeState {
  themeMode: ThemeMode;
  loaded: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  loadThemeMode: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'system',
  loaded: false,
  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  },
  loadThemeMode: async () => {
    if (get().loaded) return;
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      set({ themeMode: stored, loaded: true });
    } else {
      set({ loaded: true });
    }
  },
}));
