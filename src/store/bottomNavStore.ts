import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Opt-in bottom-navigation layout (PROJECT_PLAN §8.5). Off = current top-header
// layout; on = bottom app bar + FAB, with the drawer/overflow shown as bottom
// sheets. Persisted so the choice survives relaunch. Mirrors layoutStore.ts.
const KEY = '@csnotes/bottom_nav';

interface BottomNavState {
  enabled: boolean;
  loaded: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  toggle: () => Promise<void>;
  loadBottomNav: () => Promise<void>;
}

export const useBottomNavStore = create<BottomNavState>((set, get) => ({
  enabled: false,
  loaded: false,
  setEnabled: async (enabled) => {
    set({ enabled });
    if (enabled) {
      await AsyncStorage.setItem(KEY, 'on');
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  },
  toggle: async () => {
    await get().setEnabled(!get().enabled);
  },
  loadBottomNav: async () => {
    if (get().loaded) return;
    const stored = await AsyncStorage.getItem(KEY);
    set({ enabled: stored === 'on', loaded: true });
  },
}));
