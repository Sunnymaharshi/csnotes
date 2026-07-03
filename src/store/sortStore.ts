import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SortField = 'created' | 'updated';
export type SortDir = 'desc' | 'asc';

const FIELD_KEY = '@csnotes/sort_field';
const DIR_KEY = '@csnotes/sort_dir';

interface SortState {
  field: SortField;
  dir: SortDir;
  loaded: boolean;
  menuVisible: boolean;
  setField: (field: SortField) => Promise<void>;
  setDir: (dir: SortDir) => Promise<void>;
  loadSort: () => Promise<void>;
  openMenu: () => void;
  closeMenu: () => void;
}

export const useSortStore = create<SortState>((set, get) => ({
  field: 'created',
  dir: 'desc',
  loaded: false,
  menuVisible: false,
  setField: async (field) => {
    set({ field });
    await AsyncStorage.setItem(FIELD_KEY, field);
  },
  setDir: async (dir) => {
    set({ dir });
    await AsyncStorage.setItem(DIR_KEY, dir);
  },
  loadSort: async () => {
    if (get().loaded) return;
    const [field, dir] = await Promise.all([
      AsyncStorage.getItem(FIELD_KEY),
      AsyncStorage.getItem(DIR_KEY),
    ]);
    set({
      field: field === 'updated' ? 'updated' : 'created',
      dir: dir === 'asc' ? 'asc' : 'desc',
      loaded: true,
    });
  },
  openMenu: () => set({ menuVisible: true }),
  closeMenu: () => set({ menuVisible: false }),
}));
