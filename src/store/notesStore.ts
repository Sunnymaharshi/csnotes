import { create } from 'zustand';
import type { Note } from '../types/Note';
import type { NotesRepository } from '../data/NotesRepository';

interface TrashUndo {
  id: string;
  label: string;
}

interface NotesState {
  repo: NotesRepository | null;
  allNotes: Note[];
  favourites: Note[];
  archived: Note[];
  trash: Note[];
  trashUndo: TrashUndo | null;
  setRepo: (repo: NotesRepository) => void;
  setAllNotes: (notes: Note[]) => void;
  setFavourites: (notes: Note[]) => void;
  setArchived: (notes: Note[]) => void;
  setTrash: (notes: Note[]) => void;
  setTrashUndo: (undo: TrashUndo | null) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  repo: null,
  allNotes: [],
  favourites: [],
  archived: [],
  trash: [],
  trashUndo: null,
  setRepo: (repo) => set({ repo }),
  setAllNotes: (allNotes) => set({ allNotes }),
  setFavourites: (favourites) => set({ favourites }),
  setArchived: (archived) => set({ archived }),
  setTrash: (trash) => set({ trash }),
  setTrashUndo: (trashUndo) => set({ trashUndo }),
}));
