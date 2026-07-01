export interface Note {
  id: string;
  text: string;
  isFavourite: boolean;
  isArchived: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
