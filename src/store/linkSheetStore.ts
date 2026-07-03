import { create } from 'zustand';

export interface LinkSheetAction {
  label: string;
  onPress: () => void;
}

/** Screen-space point the link was tapped at; the menu opens beside it. */
export interface LinkAnchor {
  x: number;
  y: number;
}

interface LinkSheetState {
  visible: boolean;
  anchor: LinkAnchor;
  actions: LinkSheetAction[];
  show: (anchor: LinkAnchor, actions: LinkSheetAction[]) => void;
  hide: () => void;
}

export const useLinkSheetStore = create<LinkSheetState>((set) => ({
  visible: false,
  anchor: { x: 0, y: 0 },
  actions: [],
  show: (anchor, actions) => set({ visible: true, anchor, actions }),
  hide: () => set({ visible: false }),
}));
