# CS Notes — Project Plan

An Android notepad app rebuilt from scratch from an old Java + SQLite codebase as a
**native Expo app** backed by Firebase. Single source of truth for scope, architecture,
data model, and migration.

---

## 1. Goals

- **Low maintenance** — stop chasing Android releases; ship fixes OTA.
- **Native feel on Android** with full offline support.
- **Offline-first**, **private** (only the owner reads their notes), **$0** hosting.
- **Own the data** — JSON export/import as backup + anti-lock-in.

**Kept from the old app:** normal notes, favourites, archived, trash.
**Dropped on purpose:** categories (Home/Work/…), reminders, pinned notes, iOS, web.

> A future standalone web app can connect to the same Firebase project with zero backend changes.

---

## 2. Feature Scope

- **All Notes** list (newest first) — excludes archived + trashed.
- Create / edit / delete a note (single text field; note created only on explicit save via ✓).
- **Favourite** and **Archive** as *independent* flags (old app made these mutually exclusive).
- **Trash**: soft-delete with Undo toast → Trash view (Restore / Empty trash).
- **Search** note text (header icon); **Share** a note out.
- **Dark mode** + monochrome black-and-white styling matching the old app.
- **Export / Import** all notes as JSON.
- **Google Sign-In** + automatic Firestore sync across devices.

**Later (optional):** markdown, client-side encryption.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | Expo SDK 57 + Expo Router (file-based routing) |
| UI | Tamagui (monochrome themes in `tamagui.config.ts`) |
| Navigation | Expo Router Stack + `expo-router/drawer` |
| Lists | FlashList |
| Animation | Reanimated v4 (needs `react-native-worklets/plugin` in babel) |
| State | Zustand |
| Backend | Firebase Firestore + Auth (`@react-native-firebase`) |
| Auth | `@react-native-google-signin/google-signin` |
| Icons | lucide-react-native |
| Export/Import | `expo-file-system` + `expo-sharing` / `expo-document-picker` |

`@react-native-firebase` (native Firebase SDK) provides full Firestore offline persistence
and automatic write queuing — not possible with the Firebase JS SDK on Android.

> **Expo Go is not supported.** Native modules require a compiled development build.
> Run `npm run android:build` once, then `npm run android` for Metro hot-reload.

---

## 4. Architecture

```
UI (screens/components)  →  NotesRepository  →  @react-native-firebase (Firestore + Auth)
                                  ▲                        ↕ disk cache, auto-sync
                         Zustand store ← real-time watchers (useNotesWatcher)
```

**Rules:**
- UI never calls Firebase directly — only through `NotesRepository`.
- Firestore listeners feed the Zustand store; the UI subscribes to the store.
- Firestore offline persistence on by default; writes queue and sync automatically.

**Offline behaviour:**
- Notes load from local disk with no internet.
- Edits made offline queue and sync to Firestore when connectivity returns.

---

## 5. Data Model

Firestore path: `users/{uid}/notes/{noteId}`

```ts
interface Note {
  id: string;               // uuid
  text: string;             // single content field (no separate title)
  isFavourite: boolean;     // independent flag
  isArchived: boolean;      // independent flag
  deletedAt: number | null; // non-null = in Trash
  createdAt: number;        // epoch millis
  updatedAt: number;        // epoch millis
}
```

**View → query mapping (scoped to the signed-in user):**
| View | Condition |
|---|---|
| All Notes | `deletedAt == null && !isArchived` |
| Favourites | `deletedAt == null && isFavourite` |
| Archived | `deletedAt == null && isArchived` |
| Trash | `deletedAt != null` |

`isFavourite` / `isArchived` are independent (fixes the old single-column flaw).

**Security Rules** (`firestore.rules`) — each user can only read/write their own notes:
```js
match /users/{uid}/notes/{noteId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Private, but **not** end-to-end encrypted (Google can read at rest, like Google Keep).

---

## 6. Old App Reference (for migration)

Old schema: `Notes_Table(_id INTEGER PK, notes TEXT, date TEXT, time TEXT, state INTEGER DEFAULT 1, rem TEXT DEFAULT '0')`.

`state` was a single, mutually-exclusive column: `1` general, `2` favourite, `3` trash,
`4-8` categories (home/work/education/other/personal), `9` archived, `10` pinned (unused).
`rem` held a reminder string (`'0'` = none). `notes` was one text blob (no title field).

---

## 7. Migration (deferred — schema is ready)

The current data model is already the migration target, so `scripts/migrate.ts` will be a
simple, one-time importer emitting `notes-export.json` for in-app Import (reuses the
export/import path; no admin credentials).

**Verified against the real `Notes.db` (164 rows):**
- **Timestamp source is the `time` column** (not `date`). Newer rows store a full datetime
  *with year*, e.g. `"25Jan 2026 08:03 AM"` → parse to epoch millis for `createdAt`/`updatedAt`.
  The oldest few rows store time-of-day only → fallback: synthesize timestamps preserving
  `_id` order. The `date` column (`DDMon`, no year) is ignored.
- **State counts present: 1=120, 2=24, 8=1, 9=19** (no 3/4/5/6/7/10, and 0 reminders).
- Mapping: `state==2` → `isFavourite`; `state==9` → `isArchived`; everything else → plain note.
  `notes` blob → `text`; new uuid `id`. All 164 rows import (no trash to skip in practice).

---

## 8. Repo Structure

```
app/
  _layout.tsx            root Stack + auth gate + theme provider
  sign-in.tsx            Google Sign-In (full screen)
  note/[id].tsx          editor (single text area, bottom action bar; id='new' for creation)
  (drawer)/
    _layout.tsx          Drawer (moon logo → CS Notes / Settings)
    index.tsx            unified notes screen: chip bar switches All/Favourites/Archived/Trash
    favourites.tsx       archived.tsx  trash.tsx  (kept for router; hidden from drawer)
    settings.tsx
src/
  components/            NoteCard, EmptyState, OverflowMenu
  data/                  NotesRepository, firebase, firestoreNotesRepo
  store/                 notesStore, themeStore
  hooks/                 useNotesWatcher
  lib/                   exportImport, googleAuth, compactDate, uuid
  types/                 Note
scripts/                 (empty; migrate.ts deferred)
tamagui.config.ts        monochrome light/dark themes
firestore.rules / firestore.indexes.json
```

---

## 9. Status

**Done:** scaffold, data layer + Security Rules, auth, notes list + editor, favourite/archive,
trash + undo, search, share, dark mode, export/import, old-app-style redesign (monochrome
theme, left drawer, chip category switcher, bottom action bar), offline-first via
`@react-native-firebase`.

**Remaining:** migration (§7, deferred), and ship
(EAS Build for Android + EAS Update OTA).
