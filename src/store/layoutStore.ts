import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Layout = 'list' | 'grid';

const KEY = '@csnotes/layout';

interface LayoutState {
  layout: Layout;
  loaded: boolean;
  setLayout: (layout: Layout) => Promise<void>;
  toggle: () => Promise<void>;
  loadLayout: () => Promise<void>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: 'list',
  loaded: false,
  setLayout: async (layout) => {
    set({ layout });
    await AsyncStorage.setItem(KEY, layout);
  },
  toggle: async () => {
    await get().setLayout(get().layout === 'list' ? 'grid' : 'list');
  },
  loadLayout: async () => {
    if (get().loaded) return;
    const layout = await AsyncStorage.getItem(KEY);
    set({ layout: layout === 'grid' ? 'grid' : 'list', loaded: true });
  },
}));
