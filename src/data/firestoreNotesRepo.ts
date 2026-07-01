import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Note } from '../types/Note';
import type { NotesRepository } from './NotesRepository';
import { randomUUID } from '../lib/uuid';

function notesCol(uid: string) {
  return collection(db, 'users', uid, 'notes');
}

function toNote(data: Record<string, unknown>, id: string): Note {
  return {
    id,
    title: (data.title as string) ?? '',
    body: (data.body as string) ?? '',
    isFavourite: (data.isFavourite as boolean) ?? false,
    isArchived: (data.isArchived as boolean) ?? false,
    deletedAt: (data.deletedAt as number | null) ?? null,
    createdAt: (data.createdAt as number) ?? Date.now(),
    updatedAt: (data.updatedAt as number) ?? Date.now(),
    legacyDate: data.legacyDate as string | undefined,
  };
}

export function createFirestoreRepo(uid: string): NotesRepository {
  const col = notesCol(uid);

  return {
    watchAllNotes(cb) {
      const q = query(
        col,
        where('deletedAt', '==', null),
        where('isArchived', '==', false),
        orderBy('updatedAt', 'desc'),
      );
      return onSnapshot(q, (snap) =>
        cb(snap.docs.map((d) => toNote(d.data(), d.id))),
      );
    },

    watchFavourites(cb) {
      const q = query(
        col,
        where('deletedAt', '==', null),
        where('isFavourite', '==', true),
        orderBy('updatedAt', 'desc'),
      );
      return onSnapshot(q, (snap) =>
        cb(snap.docs.map((d) => toNote(d.data(), d.id))),
      );
    },

    watchArchived(cb) {
      const q = query(
        col,
        where('deletedAt', '==', null),
        where('isArchived', '==', true),
        orderBy('updatedAt', 'desc'),
      );
      return onSnapshot(q, (snap) =>
        cb(snap.docs.map((d) => toNote(d.data(), d.id))),
      );
    },

    watchTrash(cb) {
      const q = query(col, where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
      return onSnapshot(q, (snap) =>
        cb(snap.docs.map((d) => toNote(d.data(), d.id))),
      );
    },

    async getNote(id) {
      const snap = await getDoc(doc(col, id));
      return snap.exists() ? toNote(snap.data() as Record<string, unknown>, snap.id) : null;
    },

    async createNote(data) {
      const id = randomUUID();
      const now = Date.now();
      const note: Note = { ...data, id, createdAt: now, updatedAt: now };
      await setDoc(doc(col, id), note);
      return note;
    },

    async updateNote(id, data) {
      await updateDoc(doc(col, id), { ...data, updatedAt: Date.now() });
    },

    async deleteNote(id) {
      await deleteDoc(doc(col, id));
    },

    async trashNote(id) {
      await updateDoc(doc(col, id), { deletedAt: Date.now(), updatedAt: Date.now() });
    },

    async restoreNote(id) {
      await updateDoc(doc(col, id), { deletedAt: null, updatedAt: Date.now() });
    },

    async emptyTrash() {
      const q = query(col, where('deletedAt', '!=', null));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },

    async importNotes(notes) {
      const batch = writeBatch(db);
      notes.forEach((note) => batch.set(doc(col, note.id), note));
      await batch.commit();
    },

    async exportNotes() {
      const snap = await getDocs(col);
      return snap.docs.map((d) => toNote(d.data() as Record<string, unknown>, d.id));
    },
  };
}
