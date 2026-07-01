export interface Note {
  id: string;
  title: string;
  body: string;
  isFavourite: boolean;
  isArchived: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
  legacyDate?: string;
}
