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
**Dropped on purpose:** categories (Home/Work/…), reminders, iOS, web, drag-to-reorder (manual sort).
**Shipped post-v1 (see §8):** pin-to-top, auto-linkified note text, sort options
(Modified/Created), list/grid layout toggle, and guest mode (use without an account).

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
- **List / grid layout** toggle for note lists (persisted, `layoutStore`).
- **Export / Import** all notes as JSON.
- **Google Sign-In** + automatic Firestore sync across devices, **or guest mode** — use the app
  with no account (notes live on-device in local SQLite); signing in later migrates them into
  the account (see §4, §8.6).

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
| Backend (account) | Firebase Firestore + Auth (`@react-native-firebase`) |
| Backend (guest) | On-device SQLite (`expo-sqlite`) via `localNotesRepo` — same `NotesRepository` interface |
| Local prefs | `@react-native-async-storage/async-storage` (auth mode, sort, layout) |
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
UI (screens/components)  →  NotesRepository  →  account: @react-native-firebase (Firestore + Auth)
                                  ▲              guest:   localNotesRepo (expo-sqlite, on-device)
                         Zustand store ← real-time watchers (useNotesWatcher)
```

**Rules:**
- UI never calls the backend directly — only through the active `NotesRepository`.
- `app/_layout.tsx` picks the repo: `createFirestoreRepo(uid)` when signed in, `localRepo`
  when in guest mode. Both implement the identical `NotesRepository` interface, so the repo
  swap is invisible to the rest of the app.
- Repo listeners feed the Zustand store; the UI subscribes to the store.
- Firestore offline persistence on by default; writes queue and sync automatically. The guest
  SQLite repo is one-row-per-note with an in-memory cache + synchronous pub/sub (no whole-array
  rewrites, no ~6MB store ceiling); writes run off the render path.

**Offline behaviour:**
- Notes load from local disk with no internet (Firestore cache for accounts, SQLite for guests).
- Account edits made offline queue and sync to Firestore when connectivity returns.
- Guest notes are on-device only — no sync until the user signs in (§8.6).

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
  sortOrder?: number;       // reserved/unused — manual sort was dropped (§8.3)
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

`isFavourite` / `isArchived` are independent (fixes the old single-column flaw). The guest
SQLite repo (§8.6) applies the same view conditions locally — the `Note` shape is repo-agnostic.

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

**Ordering is the priority.** The old app rendered every list by `_id DESC` (insertion
order, `NotesDb.java`); its `time` column is the *last-edit* time (rewritten on every edit,
`_id` unchanged), so it's non-monotonic vs `_id` — ~24% of rows are "out of order" by time.
The new app's default sort is Created-desc, so `createdAt` must climb with `_id` to reproduce
the old order. `migrate.ts` therefore **splits the two dates**:
- **`createdAt`** — synthesized to increase strictly in `_id` order, spread *evenly* across
  the real date span (min→max of parsed times). Guarantees the default view matches the old
  app exactly; varied (not one date) but not per-note accurate. Never displayed — sort-only.
- **`updatedAt`** — the **true parsed edit date** from the `time` column (e.g. `"30Mar 2021
  12:38 PM"`), which is what `NoteCard` shows. Real, varied dates on cards.
- Consequence (accepted): edited-out-of-order notes get `createdAt > updatedAt`. Harmless —
  `createdAt` is invisible, and new in-app notes (`createdAt=updatedAt=now`) sort above all
  imports. The one oldest row (`_id=19`, time-of-day only, no year) is interpolated from its
  `_id`-neighbors for both fields. The `date` column (`DDMon`, no year) is ignored.

**Verified against the real `Notes.db` (186 rows):**
- **State counts present: 1=140, 2=26, 8=1, 9=19** (no 3/4/5/6/7/10, and 0 reminders/`rem`
  all `"0"`).
- Mapping: `state==2` → `isFavourite`; `state==9` → `isArchived`; everything else (incl.
  unused category `8`) → plain note. `notes` blob → `text`; new uuid `id`. All 186 rows
  import (no trash to skip in practice).

---

## 8. Post-v1 Enhancements

Additions that fit the existing single-`text`-field model without new backend services.
Explicitly **out of scope**: undo, reminders, quick-capture/widgets, labels/tags, per-note
colors, drag-to-reorder / manual sort, and AI features (all considered and declined).

Status: §8.1 Pin, §8.2 Auto-linkify, §8.3 Sort, §8.5 Bottom-nav toggle, and §8.6 Guest mode
+ layout toggle are **shipped**. §8.4 (per-card copy) is **not built**.

### 8.1 Pin to top (shipped)
Distinct from Favourite (which is a *collection/filter*): a pin keeps a note physically at the
top of a list. Adds `isPinned` (schema-independent of `isFavourite`/`isArchived` — no mutual
exclusivity in the data model). Pinned notes render in a group above the rest, with the active
sort (§8.3) applied *within* each group (pinned block, then unpinned block); JS's stable sort
keeps within-group order identical to the current sort. UI: a bulk selection action only (no
toggle in the note editor); a small pin glyph on the **right** of `NoteCard`. Confirms per the
feedback rules — toast (state change isn't self-evident from the icon alone). Reverses the old
"pinned dropped" decision (§1); old-app `state==10` was unused so there's nothing to migrate.

**Pin is an "All Notes / Favourites" concept — normalized in the mutation layer:**
- **Toggling pin does not bump `updatedAt`** (it's metadata, not a content edit) — so unpinning
  never disturbs the Modified sort. A dedicated `repo.setPinned(id, isPinned)` writes only
  `isPinned`, bypassing `updateNote`'s `updatedAt` touch.
- **Archiving clears pin** (`isPinned:false`) — an archived note leaves All Notes, so its pin
  has nowhere to render. **Trashing clears pin** too (like it already clears fav/archive).
  **Favouriting does NOT clear pin** — favourites still live in All Notes, so a pinned favourite
  stays pinned there (and in the Favourites view).
- **Bulk toggle**: a single "pin" action that pins the selection if *any* selected note is
  unpinned, and only unpins when *all* are already pinned — mirrors `bulkFavourite`/`bulkUnfavourite`.
- Net invariant: the pinned group only ever renders in **All Notes** and **Favourites**; the
  **Archived** and **Trash** views are always flat.

### 8.2 Auto-linkified note text (shipped)
Since a note is raw text, detect URLs, emails, and phone numbers in the rendered body and make
them tappable (open browser / mail / dialer). **No schema change** — pure render-layer. Applies
to `NoteCard` previews and the editor's read state; must not interfere with text selection or
the tap-to-edit gesture. Keep the detector centralized in `src/lib/` so both surfaces share it.

### 8.3 Sort options (shipped)
Expose list ordering by **field** — **Created** (default) or **Modified** — and **direction**
(desc/asc), via `src/store/sortStore.ts` (persisted to AsyncStorage; one global sort, not
per-view). Selection lives in the global overflow menu (`useGlobalOverflowItems`). The pinned
group (§8.1) always sorts above, with the chosen order applied within each group (JS stable
sort preserves within-group order).

**Drag-to-reorder / manual sort is explicitly dropped** — not worth the gesture complexity for
this app; the `sortOrder` field in §5 is reserved/unused.

### 8.4 Copy icon on list item (not built)
A small copy affordance on each `NoteCard` to copy the note's full text to the clipboard
without opening it. Uses `expo-clipboard` (already a dependency). **No schema change** —
pure UI. Confirms with a toast ("Copied") per the feedback rules (no visible state change).
Tapping the icon must not trigger the card's open/select gesture — it handles its own press,
like the linkified spans (§8.2). Placement: aligned with the date row on the card; hidden in
selection mode so it doesn't compete with the selection tap.

### 8.5 Bottom navigation toggle (shipped)
Everything except the new-note FAB used to sit in the **top header** — out of thumb reach.
Bottom-nav is an **opt-in toggle** (`bottomNavStore`, persisted; Settings → Appearance →
"Navigation bar" Top/Bottom). Default OFF preserves the top-header layout unchanged.

When ON, the `HeaderStar` cluster is **relocated to a bottom app bar** (`src/components/
BottomBar.tsx`) — not redesigned — leaving a **title-only** top header with **no hamburger in
the header** (the bar's hamburger replaces the drawer; the left-edge swipe is also disabled).
The bar is **pure navigation + Search**, with a **single** hamburger for everything else (no
redundant second "more" button): `[🗒 All Notes] [★ Favourites] [🔍 Search] [≡]`.
- **All Notes / Favourites** are direct one-tap navigation (the old `HeaderStar` shortcuts).
- **Search** gets its own bar button (`useGlobalOverflowItems(..., includeSearch=false)` drops
  it from the sheet so it isn't duplicated).
- **≡ Hamburger** opens **one sectioned bottom sheet** (`BottomSheetSections`): an *Actions*
  group — Sort, Layout, Light/Dark theme toggle (a quick light⇄dark flip, no System option —
  that stays in Settings) (+ Restore/Clear on Trash) — and a *Go to* group — Archived / Trash /
  Settings (`BOTTOM_NAV_MENU_ITEMS` from `app/(drawer)/_layout.tsx`).
- **FAB** stays **floating** (bottom-right, All Notes only) in both layouts — it just sits
  above the bar in bottom-nav mode. Hidden while searching, like the top-nav layout.
- **Sheets/submenus** are hand-rolled `Modal`s (`src/components/BottomSheet.tsx` →
  `BottomSheetMenu`), mirroring `OverflowMenu` — no new dependency. In bottom-nav mode the
  **Sort menu** (`SortMenu`) also anchors to the bottom instead of the top-right.

Applies to all four list views (index/favourites/archived/trash). **Selection mode moves to a
bottom bar too** in bottom-nav mode (`src/components/BottomSelectionBar.tsx`); the top-nav
layout keeps the top `SelectionHeader`. Both selection bars expose the same actions:
**Favourite · Delete · Share · Pin · More** — Pin (`buildSelectionPinItem`, hidden in
Archived/Trash per §8.1) and Delete (`buildSelectionDeleteItem`, "delete forever" on Trash)
are dedicated icons; the rest (unfavourite/archive/unarchive/restore) stay in the More
overflow (`buildSelectionOverflowItems`). Settings and the note editor (own bottom action bar)
are untouched. The branch lives in both `NoteListScreen.tsx` and the near-duplicate
`app/(drawer)/trash.tsx`.

### 8.6 Guest mode + layout toggle (shipped)
**Guest mode** lets someone use the app with no account. `src/store/authStore.ts` persists a
single `isGuest` flag to AsyncStorage so a returning guest skips the login wall (a signed-in
Firebase user is the source of truth for the account case). When `isGuest`, `app/_layout.tsx`
selects `localNotesRepo` (`src/data/localNotesRepo.ts`) — an on-device SQLite repo that mirrors
`firestoreNotesRepo` method-for-method (one row per note, in-memory cache + synchronous pub/sub;
migrates a legacy single-blob key on load). No sync, no schema change.

**Guest → account migration** (`src/lib/syncGuest.ts`, `signInAndSync`): export the on-device
notes, sign in with Google, `importNotes` them into the account (batched upsert-by-id; local
ids are fresh uuids so merging with notes already synced from another device is additive and
collision-free), then clear local storage. Returns the count migrated. `app/_layout.tsx` also
clears the persisted guest flag once a real user resolves.

**Layout toggle**: `src/store/layoutStore.ts` persists a `list | grid` choice (AsyncStorage);
`NoteCard`/`NoteListScreen` render accordingly (grid allows a taller preview). Toggle lives in
the header (`HeaderStar`).

---

## 9. Repo Structure

```
app/
  _layout.tsx            root Stack + auth gate (account/guest) + repo selection +
                         theme provider + ShareIntentProvider
  sign-in.tsx            Google Sign-In / continue-as-guest (full screen)
  note/[id].tsx          editor (single text area, bottom action bar; id='new' for creation)
  (drawer)/
    _layout.tsx          Drawer (moon logo → All Notes / Favourites / Archived / Trash /
                         Settings) — navigation only, slimmed
    index.tsx  favourites.tsx  archived.tsx  trash.tsx
    settings.tsx         Account (sign-in/sync or profile + sign-out) / Appearance /
                         Backup (import-export) / About / Danger Zone (delete all + account)
src/
  components/            NoteCard, EmptyState, HeaderStar, NoteListScreen, OverflowMenu,
                          SearchBar, SelectionHeader, LinkifiedText (§8.2),
                          BottomBar + BottomSheet + BottomSelectionBar (bottom-nav — §8.5),
                          PressableScale (standard tappable: press-scale + optional haptic)
  data/                  NotesRepository (interface), firebase, firestoreNotesRepo (account),
                          localNotesRepo (guest, on-device SQLite — §8.6)
  store/                 notesStore, themeStore, authStore (guest flag), sortStore (§8.3),
                          layoutStore (list/grid — §8.6), bottomNavStore (§8.5)
  hooks/                 useNotesWatcher, useSearchBar, useSelectionMode,
                          useGlobalOverflowItems, useDrawerCloseGuard
  lib/                   exportImport, globalOverflowActions, bulkNoteActions, googleAuth,
                          syncGuest (guest→account migration — §8.6), linkify + linkActions
                          (§8.2), compactDate, relativeTime, uuid, icons (size/stroke consts),
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
(numeric selectors, stabilized hook callbacks). Post-v1 enhancements: pin-to-top (§8.1),
auto-linkified text (§8.2), sort by Created/Modified (§8.3), list/grid layout toggle, guest
mode with guest→account migration (§8.6), and the bottom-navigation toggle (§8.5).

**Remaining:**
- **Features:** §8.4 per-card copy icon (not built).
- **Ship:** EAS Build for Android + EAS Update OTA. See §11 for the pre-publish checklist.

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

---

## 11. Pre-Publish Checklist (Play Store)

Audited 2026-07-04. Store metadata, build config, and code cleanliness are in good shape
(`applicationId` `com.sunny.csnotes` is set, icons/adaptive icon configured, version `1.0.0`,
no leaked secrets, no stray TODO/console.log, dependencies stable on Expo SDK 57). Before
submitting:

- [ ] **Privacy policy (blocker).** Play Store requires one since the app uses Google
  Sign-In + Firebase (handles auth/user data). Draft it, host it (e.g. GitHub Pages), and
  add the URL to the Play Console listing.
- [ ] **`eas.json` `appVersionSource`.** Not currently set — decide whether to rely on EAS's
  remote versionCode auto-increment or set it explicitly, before the first production build.
- [ ] **Production Firebase project.** Confirm the local `google-services.json` (gitignored,
  present at repo root and `android/app/`) points at the production project, not a dev/test
  one, before building for release.
- [ ] **Splash screen.** No splash config was found in `app.json`/plugins — confirm one
  actually shows on launch, or that a blank launch is intentional.
- [ ] **`eas.json` `submit.production`.** Currently an empty block (fine as a default) —
  make sure a Play Console service-account key is set up before running `eas submit`.
