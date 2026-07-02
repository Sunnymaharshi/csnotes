import firestore from '@react-native-firebase/firestore';
import type { Note } from '../types/Note';
import type { NotesRepository } from './NotesRepository';
import { randomUUID } from '../lib/uuid';

function notesCol(uid: string) {
  return firestore().collection('users').doc(uid).collection('notes');
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
      return col
        .where('deletedAt', '==', null)
        .where('isArchived', '==', false)
        .orderBy('updatedAt', 'desc')
        .onSnapshot((snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchFavourites(cb) {
      return col
        .where('deletedAt', '==', null)
        .where('isFavourite', '==', true)
        .orderBy('updatedAt', 'desc')
        .onSnapshot((snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchArchived(cb) {
      return col
        .where('deletedAt', '==', null)
        .where('isArchived', '==', true)
        .orderBy('updatedAt', 'desc')
        .onSnapshot((snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    watchTrash(cb) {
      return col
        .where('deletedAt', '!=', null)
        .orderBy('deletedAt', 'desc')
        .onSnapshot((snap) => cb(snap.docs.map((d) => toNote(d.data(), d.id))));
    },

    async getNote(id) {
      const snap = await col.doc(id).get();
      return snap.exists() ? toNote(snap.data() as Record<string, unknown>, snap.id) : null;
    },

    async createNote({ id: requestedId, ...data }) {
      const id = requestedId ?? randomUUID();
      const now = Date.now();
      const note: Note = { ...data, id, createdAt: now, updatedAt: now };
      await col.doc(id).set(note);
      return note;
    },

    async updateNote(id, data) {
      await col.doc(id).update({ ...data, updatedAt: Date.now() });
    },

    async deleteNote(id) {
      await col.doc(id).delete();
    },

    async trashNote(id) {
      await col.doc(id).update({
        deletedAt: Date.now(),
        isFavourite: false,
        isArchived: false,
        updatedAt: Date.now(),
      });
    },

    async restoreNote(id) {
      await col.doc(id).update({ deletedAt: null, updatedAt: Date.now() });
    },

    async emptyTrash() {
      const snap = await col.where('deletedAt', '!=', null).get();
      const batch = firestore().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },

    async restoreAllTrash() {
      const snap = await col.where('deletedAt', '!=', null).get();
      const batch = firestore().batch();
      snap.docs.forEach((d) => batch.update(d.ref, { deletedAt: null, updatedAt: Date.now() }));
      await batch.commit();
    },

    async deleteEverything() {
      const snap = await col.get();
      const batch = firestore().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },

    async importNotes(notes) {
      const batch = firestore().batch();
      notes.forEach((note) => batch.set(col.doc(note.id), note));
      await batch.commit();
    },

    async exportNotes() {
      const snap = await col.get();
      return snap.docs.map((d) => toNote(d.data() as Record<string, unknown>, d.id));
    },
  };
}
