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

**Kept from the old app:** normal notes, favourites, archived, trash, share-into-app.
**Dropped on purpose:** categories (Home/Work/…), reminders, iOS, web.
**Now planned (post-v1):** pin-to-top, auto-linkified note text, sort options — see §10.

> A future standalone web app can connect to the same Firebase project with zero backend changes.

---

## 2. Feature Scope

- **All Notes** list (newest first) — excludes archived + trashed, includes favourites.
- Create / edit / delete a note (single text field). **No autosave-while-typing**: a note
  only saves on the ✓ button, on navigating back, or on unmount — force-closing the app
  mid-edit discards unsaved changes by design (see `app/note/[id].tsx`).
- **Favourite** and **Archive** flags are independent in the schema, but the editor/bulk-action
  UI still enforces mutual exclusivity (setting one clears the other) — matches old-app
  behavior for now; revisit if simultaneous favourite+archive is ever wanted.
- **Trash**: soft-delete (no undo) → Trash view (Restore / Empty trash).
- **Search** note text — per-view (searches only the currently open list, not global).
- **Share out** a note; **share text in** from other apps opens a new note pre-filled with
  the shared text, following the same save-on-back / discard-on-close rules as any new note
  (`expo-share-intent`, Android `ACTION_SEND`/`text/*`).
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
| Icons | lucide-react-native (conventions in `src/lib/icons.ts`) |
| Feedback | `expo-haptics` (via `src/lib/haptics.ts`) + Android toasts (`src/lib/toast.ts`) |
| Export/Import | `expo-file-system` + `expo-sharing` / `expo-document-picker` |
| Share-in | `expo-share-intent` (Android `ACTION_SEND`, `text/*` only) |

`@react-native-firebase` (native Firebase SDK) provides full Firestore offline persistence
and automatic write queuing — not possible with the Firebase JS SDK on Android.

> **Expo Go is not supported.** Native modules require a compiled development build.
> Run `npm run android:build` once, then `npm run android` for Metro hot-reload.

**Dependency policy:** all native-module versions are pinned to what
`npx expo install --check` / `npx expo-doctor` expect for the installed SDK (currently 57) —
don't chase `npm outdated`'s "latest" past what the SDK has tested. `package.json` has an
`"overrides"` block forcing `expo-share-intent`'s nested `expo`/`expo-constants`/`expo-linking`
and `react-dom` (pulled in only by `expo-router`'s web devtools) to match the root versions,
so `npm install` needs no `--legacy-peer-deps`. Run both checks after any dependency change.

> ⚠️ **Known risk:** `expo-share-intent` only officially supports up to Expo SDK 56 (it works
> on 57 today, but `expo prebuild` logs a version-mismatch warning every run). Before
> upgrading to SDK 58+, check whether this package has caught up — it's the most likely
> dependency to need replacing or patching.

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
  isPinned?: boolean;       // §8.1 — pinned notes sort above the rest (independent flag)
  sortOrder?: number;       // §8.3 — manual-sort position; unset until user reorders
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

## 7. Migration (done)

`scripts/migrate.ts` is a one-time importer: reads `scripts/Notes.db` (old SQLite, not
committed) via `node:sqlite`, writes `scripts/notes-export.json` in the same `Note[]` shape
the app's Import feature already accepts (reuses the export/import path; no admin
credentials). Run with `node scripts/migrate.ts [path/to/Notes.db]`, then use the app's
Import to load `scripts/notes-export.json`.

**Verified against the real `Notes.db` (187 rows):**
- **Timestamp source is the `time` column** (not `date`). Rows store a full datetime *with
  year*, e.g. `"30Mar 2021 12:38 PM"` → parsed to epoch millis for `createdAt`/`updatedAt`.
  The one oldest row (`_id=19`) stores time-of-day only → synthesized timestamp interpolated
  between its `_id`-adjacent neighbors to preserve ordering. The `date` column (`DDMon`, no
  year) is ignored.
- **State counts present: 1=141, 2=26, 8=1, 9=19** (no 3/4/5/6/7/10, and 0 reminders/`rem`
  all `"0"`).
- Mapping: `state==2` → `isFavourite`; `state==9` → `isArchived`; everything else (incl.
  unused category `8`) → plain note. `notes` blob → `text`; new uuid `id`. All 187 rows
  import (no trash to skip in practice).

---

## 8. Planned Enhancements (approved, post-v1)

Three additions that fit the existing single-`text`-field model without a backend or new
services. Explicitly **out of scope**: undo, reminders, quick-capture/widgets, labels/tags,
per-note colors, and AI features (all considered and declined).

### 8.1 Pin to top
Distinct from Favourite (which is a *collection/filter*): a pin keeps a note physically at the
top of a list. Adds `isPinned` (independent of `isFavourite`/`isArchived` — no mutual
exclusivity). Pinned notes render in a group above the rest in **All Notes** (and other
non-trash views); ties fall back to the active sort (§8.3). UI: toggle in the editor overflow
+ bulk action; a small pin glyph on `NoteCard`. Confirms per the feedback rules — toast (state
change isn't self-evident from the icon alone). Reverses the old "pinned dropped" decision
(§1); old-app `state==10` was unused so there's nothing to migrate.

### 8.2 Auto-linkified note text
Since a note is raw text, detect URLs, emails, and phone numbers in the rendered body and make
them tappable (open browser / mail / dialer). **No schema change** — pure render-layer. Applies
to `NoteCard` previews and the editor's read state; must not interfere with text selection or
the tap-to-edit gesture. Keep the detector centralized in `src/lib/` so both surfaces share it.

### 8.3 Sort options
Expose list ordering: **Modified** (default, current behavior), **Created**, and **Manual**
(drag-to-reorder). Manual persists via `sortOrder`; unset until the user first reorders, then
falls back to modified order. Pinned group (§8.1) always sorts above, with the chosen order
applied within each group. Selection lives in the global overflow menu; persist the choice
locally (per-view is out of scope — one global sort). FlashList v2 supports the reorder gesture
via `react-native-reanimated`/gesture-handler already in the stack.

---

## 9. Repo Structure

```
app/
  _layout.tsx            root Stack + auth gate + theme provider + ShareIntentProvider
  sign-in.tsx            Google Sign-In (full screen)
  note/[id].tsx          editor (single text area, bottom action bar; id='new' for creation)
  (drawer)/
    _layout.tsx          Drawer (moon logo → CS Notes / Favourites / Archived / Trash;
                         appearance/backup/sign-out controls inline in drawer content)
    index.tsx  favourites.tsx  archived.tsx  trash.tsx
src/
  components/            NoteCard, EmptyState, HeaderStar, NoteListScreen, OverflowMenu,
                          SearchBar, SelectionHeader, PressableScale (standard tappable:
                          press-scale + optional haptic)
  data/                  NotesRepository, firebase, firestoreNotesRepo
  store/                 notesStore, themeStore
  hooks/                 useNotesWatcher, useSearchBar, useSelectionMode,
                          useGlobalOverflowItems, useDrawerCloseGuard
  lib/                   exportImport, globalOverflowActions, bulkNoteActions, googleAuth,
                          compactDate, relativeTime, uuid, icons (size/stroke consts),
                          haptics (restrained feedback wrappers), toast (single showToast)
  types/                 Note
scripts/                 migrate.ts (old SQLite → notes-export.json, see §7)
tamagui.config.ts        monochrome light/dark themes
firestore.rules / firestore.indexes.json
```

---

## 10. Status

**Done:** scaffold, data layer + Security Rules, auth, notes list + editor, favourite/archive,
trash, per-view search, selection mode + bulk actions, share out, share-in
(`expo-share-intent`), dark mode, export/import, old-app-style redesign (monochrome theme,
left drawer, bottom action bar), offline-first via `@react-native-firebase`, dependency
versions aligned to Expo SDK 57 (`expo-doctor` 20/20), migration script (§7). UI/UX polish:
themed status bar + header tint, consistent icon system, `PressableScale` press feedback,
`expo-haptics` (restrained) + consistent per-mutation toasts, store re-render optimizations
(numeric selectors, stabilized hook callbacks).

**Remaining:** ship (EAS Build for Android + EAS Update OTA).

**Future (offline polish):** Firestore's native SDK already gives offline persistence
(instant local writes, cache-first reads, auto-sync on reconnect) — these are refinements,
not gaps:
- Verify auth-gated cold start offline: confirm `auth()` resolves a cached user (and the
  notes repo/watchers still initialize) on first launch with no network and a previously
  signed-in session.
- Optional offline/sync-status indicator (e.g. small banner) so queued-but-unsynced writes
  are visible to the user, instead of being silent.
- Confirm empty state reads cleanly on a brand-new device that's offline before its first
  sync (no cache yet) rather than looking broken.
