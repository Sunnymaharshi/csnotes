import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note } from '../types/Note';
import type { NotesRepository } from './NotesRepository';
import { randomUUID } from '../lib/uuid';

// Guest / offline notes live on-device only, in a local SQLite database. Mirrors
// firestoreNotesRepo.ts method-for-method so switching repos is invisible to the
// rest of the app.
//
// Persistence is ONE ROW PER NOTE, so a save writes only the note that changed —
// never a whole-array rewrite, and no ~6MB store ceiling. Reactivity is an
// in-memory cache + a synchronous pub/sub: mutations update the cache and notify
// listeners immediately (snappy UI, like Firestore's local cache), then the
// single-row SQL write runs off the render path.
//
// Every mutation replaces the touched note with a NEW object (never mutates in
// place) — NoteCard is memo'd and compares its `note` prop by reference, so a
// fresh object is what makes an edited card re-render.
const DB_NAME = 'csnotes-guest.db';
// Legacy single-blob key from the first cut of guest mode — migrated on load.
const LEGACY_BLOB_KEY = '@csnotes/guest_notes';

interface Row {
  id: string;
  text: string;
  isFavourite: number;
  isArchived: number;
  isPinned: number;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

function rowToNote(r: Row): Note {
  return {
    id: r.id,
    text: r.text ?? '',
    isFavourite: !!r.isFavourite,
    isArchived: !!r.isArchived,
    isPinned: !!r.isPinned,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt ?? Date.now(),
    updatedAt: r.updatedAt ?? Date.now(),
  };
}

// Positional params for INSERT OR REPLACE, in column order.
function noteToParams(n: Note): [string, string, number, number, number, number | null, number, number] {
  return [
    n.id,
    n.text ?? '',
    n.isFavourite ? 1 : 0,
    n.isArchived ? 1 : 0,
    n.isPinned ? 1 : 0,
    n.deletedAt ?? null,
    n.createdAt,
    n.updatedAt,
  ];
}

const UPSERT_SQL =
  'INSERT OR REPLACE INTO notes (id, text, isFavourite, isArchived, isPinned, deletedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

const byUpdatedDesc = (a: Note, b: Note) => b.updatedAt - a.updatedAt;
const byDeletedDesc = (a: Note, b: Note) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0);

let cache: Note[] = [];
let db: SQLite.SQLiteDatabase | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;

// Each watcher registers an emitter here; every mutation calls notify() to
// re-run the emitters' filters over the cache and push fresh arrays to the store.
const listeners = new Set<() => void>();

// One-time upgrade from the legacy single-blob AsyncStorage store into SQLite.
async function migrateLegacyBlob(database: SQLite.SQLiteDatabase): Promise<void> {
  const raw = await AsyncStorage.getItem(LEGACY_BLOB_KEY);
  if (!raw) return;
  let notes: Note[] = [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    notes = parsed.map((d) =>
      rowToNote({
        id: (d.id as string) ?? randomUUID(),
        text: (d.text as string) ?? '',
        isFavourite: d.isFavourite ? 1 : 0,
        isArchived: d.isArchived ? 1 : 0,
        isPinned: d.isPinned ? 1 : 0,
        deletedAt: (d.deletedAt as number | null) ?? null,
        createdAt: (d.createdAt as number) ?? Date.now(),
        updatedAt: (d.updatedAt as number) ?? Date.now(),
      }),
    );
  } catch {
    notes = [];
  }
  if (notes.length) {
    await database.withTransactionAsync(async () => {
      for (const n of notes) await database.runAsync(UPSERT_SQL, noteToParams(n));
    });
  }
  await AsyncStorage.removeItem(LEGACY_BLOB_KEY);
}

function ensureLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DB_NAME);
      await database.execAsync(
        `CREATE TABLE IF NOT EXISTS notes (
           id          TEXT PRIMARY KEY NOT NULL,
           text        TEXT NOT NULL DEFAULT '',
           isFavourite INTEGER NOT NULL DEFAULT 0,
           isArchived  INTEGER NOT NULL DEFAULT 0,
           isPinned    INTEGER NOT NULL DEFAULT 0,
           deletedAt   INTEGER,
           createdAt   INTEGER NOT NULL,
           updatedAt   INTEGER NOT NULL
         );`,
      );
      await migrateLegacyBlob(database);
      const rows = await database.getAllAsync<Row>('SELECT * FROM notes');
      db = database;
      cache = rows.map(rowToNote);
      loaded = true;
    })();
  }
  return loadPromise;
}

function notify() {
  listeners.forEach((emit) => emit());
}

function upsert(note: Note): Promise<unknown> {
  return db!.runAsync(UPSERT_SQL, noteToParams(note));
}

function watch(select: (notes: Note[]) => Note[], cb: (notes: Note[]) => void): () => void {
  const emit = () => cb(select(cache));
  listeners.add(emit);
  // Emit the initial value once the cache is ready; subsequent changes go through notify().
  ensureLoaded().then(emit);
  return () => {
    listeners.delete(emit);
  };
}

export const localRepo: NotesRepository = {
  watchAllNotes(cb) {
    return watch(
      (notes) => notes.filter((n) => n.deletedAt === null && !n.isArchived).sort(byUpdatedDesc),
      cb,
    );
  },

  watchFavourites(cb) {
    return watch(
      (notes) => notes.filter((n) => n.deletedAt === null && n.isFavourite).sort(byUpdatedDesc),
      cb,
    );
  },

  watchArchived(cb) {
    return watch(
      (notes) => notes.filter((n) => n.deletedAt === null && n.isArchived).sort(byUpdatedDesc),
      cb,
    );
  },

  watchTrash(cb) {
    return watch((notes) => notes.filter((n) => n.deletedAt !== null).sort(byDeletedDesc), cb);
  },

  async getNote(id) {
    await ensureLoaded();
    return cache.find((n) => n.id === id) ?? null;
  },

  async createNote({ id: requestedId, ...data }) {
    await ensureLoaded();
    const id = requestedId ?? randomUUID();
    const now = Date.now();
    const note: Note = { ...data, id, createdAt: now, updatedAt: now };
    // Mirror Firestore setDoc semantics: claiming an existing id overwrites it.
    cache = [...cache.filter((n) => n.id !== id), note];
    notify();
    await upsert(note);
    return note;
  },

  async updateNote(id, data) {
    await ensureLoaded();
    let updated: Note | undefined;
    cache = cache.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, ...data, updatedAt: Date.now() };
      return updated;
    });
    notify();
    if (updated) await upsert(updated);
  },

  async setPinned(id, isPinned) {
    await ensureLoaded();
    // No updatedAt bump — pin is metadata, so unpinning won't disturb the sort (§8.1).
    let updated: Note | undefined;
    cache = cache.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, isPinned };
      return updated;
    });
    notify();
    if (updated) await db!.runAsync('UPDATE notes SET isPinned = ? WHERE id = ?', [isPinned ? 1 : 0, id]);
  },

  async deleteNote(id) {
    await ensureLoaded();
    cache = cache.filter((n) => n.id !== id);
    notify();
    await db!.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  },

  async trashNote(id) {
    await ensureLoaded();
    const now = Date.now();
    let updated: Note | undefined;
    cache = cache.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, deletedAt: now, isFavourite: false, isArchived: false, isPinned: false, updatedAt: now };
      return updated;
    });
    notify();
    if (updated) await upsert(updated);
  },

  async restoreNote(id) {
    await ensureLoaded();
    let updated: Note | undefined;
    cache = cache.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, deletedAt: null, updatedAt: Date.now() };
      return updated;
    });
    notify();
    if (updated) await upsert(updated);
  },

  async emptyTrash() {
    await ensureLoaded();
    cache = cache.filter((n) => n.deletedAt === null);
    notify();
    await db!.runAsync('DELETE FROM notes WHERE deletedAt IS NOT NULL');
  },

  async restoreAllTrash() {
    await ensureLoaded();
    const now = Date.now();
    cache = cache.map((n) => (n.deletedAt !== null ? { ...n, deletedAt: null, updatedAt: now } : n));
    notify();
    await db!.runAsync('UPDATE notes SET deletedAt = NULL, updatedAt = ? WHERE deletedAt IS NOT NULL', [now]);
  },

  async deleteEverything() {
    await ensureLoaded();
    cache = [];
    notify();
    await db!.runAsync('DELETE FROM notes');
  },

  async importNotes(notes) {
    await ensureLoaded();
    // Upsert by id (matches Firestore batch.set), so re-importing overwrites in place.
    const incoming = notes.map((n) =>
      rowToNote({
        id: n.id,
        text: n.text ?? '',
        isFavourite: n.isFavourite ? 1 : 0,
        isArchived: n.isArchived ? 1 : 0,
        isPinned: n.isPinned ? 1 : 0,
        deletedAt: n.deletedAt ?? null,
        createdAt: n.createdAt ?? Date.now(),
        updatedAt: n.updatedAt ?? Date.now(),
      }),
    );
    const ids = new Set(incoming.map((n) => n.id));
    cache = [...cache.filter((n) => !ids.has(n.id)), ...incoming];
    notify();
    if (incoming.length) {
      await db!.withTransactionAsync(async () => {
        for (const n of incoming) await db!.runAsync(UPSERT_SQL, noteToParams(n));
      });
    }
  },

  async exportNotes() {
    await ensureLoaded();
    return [...cache];
  },
};

/** Wipe the local guest store — used after a successful sign-in-to-sync migration. */
export async function clearLocalNotes(): Promise<void> {
  await ensureLoaded();
  cache = [];
  notify();
  await db!.runAsync('DELETE FROM notes');
  await AsyncStorage.removeItem(LEGACY_BLOB_KEY);
}
