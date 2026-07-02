import type { Note } from '../types/Note';

export interface NotesRepository {
  /** All notes that are not archived and not trashed. */
  watchAllNotes(cb: (notes: Note[]) => void): () => void;
  watchFavourites(cb: (notes: Note[]) => void): () => void;
  watchArchived(cb: (notes: Note[]) => void): () => void;
  watchTrash(cb: (notes: Note[]) => void): () => void;

  getNote(id: string): Promise<Note | null>;
  /** Pass `id` to claim it up front (e.g. to make a create idempotent against retries/races). */
  createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note>;
  updateNote(id: string, data: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void>;
  deleteNote(id: string): Promise<void>;

  /** Move to trash (set deletedAt, clear isFavourite/isArchived so restore always returns to normal). */
  trashNote(id: string): Promise<void>;
  /** Restore from trash (clear deletedAt). */
  restoreNote(id: string): Promise<void>;
  /** Permanently delete all trashed notes. */
  emptyTrash(): Promise<void>;
  /** Restore every note currently in trash. */
  restoreAllTrash(): Promise<void>;
  /** Permanently delete every note, regardless of state. */
  deleteEverything(): Promise<void>;

  importNotes(notes: Note[]): Promise<void>;
  exportNotes(): Promise<Note[]>;
}
