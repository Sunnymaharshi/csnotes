import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
} from '@react-native-firebase/firestore';
import type { Note } from '../types/Note';
import type { NotesRepository } from './NotesRepository';
import { randomUUID } from '../lib/uuid';

const db = getFirestore();

function notesCol(uid: string) {
  return collection(doc(collection(db, 'users'), uid), 'notes');
}

const BATCH_LIMIT = 500;

async function commitInChunks<T>(items: T[], apply: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH_LIMIT).forEach((item) => apply(batch, item));
    await batch.commit();
  }
}

function toNote(data: Record<string, unknown>, id: string): Note {
  return {
    id,
    text: (data.text as string) ?? '',
    isFavourite: (data.isFavourite as boolean) ?? false,
    isArchived: (data.isArchived as boolean) ?? false,
    deletedAt: (data.deletedAt as number | null) ?? null,
    createdAt: (data.createdAt as number) ?? Date.now(),
    updatedAt: (data.updatedAt as number) ?? Date.now(),
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
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchFavourites(cb) {
      const q = query(
        col,
        where('deletedAt', '==', null),
        where('isFavourite', '==', true),
        orderBy('updatedAt', 'desc'),
      );
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchArchived(cb) {
      const q = query(
        col,
        where('deletedAt', '==', null),
        where('isArchived', '==', true),
        orderBy('updatedAt', 'desc'),
      );
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchTrash(cb) {
      const q = query(col, where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    async getNote(id) {
      const snap = await getDoc(doc(col, id));
      return snap.exists() ? toNote(snap.data() as Record<string, unknown>, snap.id) : null;
    },

    async createNote({ id: requestedId, ...data }) {
      const id = requestedId ?? randomUUID();
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
      await updateDoc(doc(col, id), {
        deletedAt: Date.now(),
        isFavourite: false,
        isArchived: false,
        updatedAt: Date.now(),
      });
    },

    async restoreNote(id) {
      await updateDoc(doc(col, id), { deletedAt: null, updatedAt: Date.now() });
    },

    async emptyTrash() {
      const snap = await getDocs(query(col, where('deletedAt', '!=', null)));
      await commitInChunks(snap.docs, (batch, d) => batch.delete(d.ref));
    },

    async restoreAllTrash() {
      const snap = await getDocs(query(col, where('deletedAt', '!=', null)));
      await commitInChunks(snap.docs, (batch, d) =>
        batch.update(d.ref, { deletedAt: null, updatedAt: Date.now() }),
      );
    },

    async deleteEverything() {
      const snap = await getDocs(col);
      await commitInChunks(snap.docs, (batch, d) => batch.delete(d.ref));
    },

    async importNotes(notes) {
      await commitInChunks(notes, (batch, note) => batch.set(doc(col, note.id), note));
    },

    async exportNotes() {
      const snap = await getDocs(col);
      return snap.docs.map((d) => toNote(d.data() as Record<string, unknown>, d.id));
    },
  };
}
