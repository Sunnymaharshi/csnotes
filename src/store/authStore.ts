import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only the guest choice is persisted. A signed-in firebase user is the source of
// truth for the account case; `isGuest` covers the "using the app without an
// account" case so a returning guest skips the login wall.
const STORAGE_KEY = '@csnotes/auth_mode';

interface AuthState {
  isGuest: boolean;
  loaded: boolean;
  loadGuest: () => Promise<void>;
  setGuest: (v: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isGuest: false,
  loaded: false,
  loadGuest: async () => {
    if (get().loaded) return;
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    set({ isGuest: stored === 'guest', loaded: true });
  },
  setGuest: async (v) => {
    set({ isGuest: v });
    if (v) {
      await AsyncStorage.setItem(STORAGE_KEY, 'guest');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },
}));
