export interface Note {
  id: string;
  text: string;
  isFavourite: boolean;
  isArchived: boolean;
  isPinned?: boolean; // §8.1 — pinned notes sort above the rest; unset = not pinned
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
