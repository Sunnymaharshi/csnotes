import type { Note } from '../types/Note';

export interface NotesRepository {
  /** All notes that are not archived and not trashed. */
  watchAllNotes(cb: (notes: Note[]) => void): () => void;
  watchFavourites(cb: (notes: Note[]) => void): () => void;
  watchArchived(cb: (notes: Note[]) => void): () => void;
  watchTrash(cb: (notes: Note[]) => void): () => void;

  getNote(id: string): Promise<Note | null>;
  createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note>;
  updateNote(id: string, data: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void>;
  deleteNote(id: string): Promise<void>;

  /** Move to trash (set deletedAt). */
  trashNote(id: string): Promise<void>;
  /** Restore from trash (clear deletedAt). */
  restoreNote(id: string): Promise<void>;
  /** Permanently delete all trashed notes. */
  emptyTrash(): Promise<void>;

  importNotes(notes: Note[]): Promise<void>;
  exportNotes(): Promise<Note[]>;
}
