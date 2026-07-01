# CS Notes — Rebuild Plan

A from-scratch rebuild of the old "CS Notes" Android notepad (Java + raw SQLite, unlisted
from the Play Store, painful to maintain). This document is the single source of truth for
the new project's **scope, architecture, tech stack, data model, and roadmap**.

> Move this file into the new project repo as `PROJECT_PLAN.md`.

---

## 1. Goals & Guiding Principles

| Priority | Goal |
|---|---|
| 1 | **Low long-term maintenance** — stop chasing every new Android version. |
| 2 | **Easy to update** — ship fixes without store friction (OTA). |
| 3 | **Native Android feel** — real native views, not a webview wrapper. |
| 4 | **Also on web** — view/edit notes from a laptop. |
| 5 | **Offline-first** — works with no connection, like the current app. |
| 6 | **Secure & private** — only I can read my notes. |
| 7 | **$0 cost** — every layer must have a viable free tier. |
| 8 | **Own my data** — export/import as a backup + anti-lock-in escape hatch. |

**Kept from the old app:** normal notes, **favourites**, **archived**, **trash**.

**Non-goals (deliberately dropped to reduce complexity):**
- **Categories** (Home / Work / Education / Other / Personal) — unused; collapsed to normal notes.
- **Reminders** + notification scheduling (`rem` column, `BroadcastRec`).
- Pinned notes (`state 10` was never really wired up).
- iOS app (primary user is Android-only; web covers laptop).

---

## 2. What the Old App Was (for reference & migration)

> ⚠️ The repo's `master` branch is a much older version. **The real, latest source is the
> `sourcecode` branch ("v3.5")** — nav drawer, categories, reminders, DB versioning.
> Everything below is verified from `origin/sourcecode`.

- **Stack:** Java, AndroidX, raw SQLite, XML views, Navigation Drawer. Gradle, jcenter.
  (A Firebase backup feature existed mid-history per commit "restore from firebase" but was
  **removed before the final version** — the latest branch has no Firebase deps; see §7.)
- **Screens:** `MainActivity` (drawer + list + context actions + search), `DisplayNote`
  (editor with category Spinner + reminder), `recieveInfo` (receive shared text),
  `BroadcastRec` (reminder alarm receiver).
- **Schema (DB version 2):**
  `Notes_Table(_id INTEGER PRIMARY KEY, notes TEXT NOT NULL, date TEXT, time TEXT, state INTEGER DEFAULT 1, rem TEXT DEFAULT '0')`
  - DB **v1** had no `rem`; **v2** added `rem TEXT DEFAULT '0'` via `ALTER TABLE` in `onUpgrade`.
  - A `Pin_C = "pin"` constant exists but **no `pin` column is created** — pin was never persisted as a column.

#### Exact `state` enum (single, mutually-exclusive column — verified from `NotesDb.java`)
| `state` | Meaning | | `state` | Meaning |
|---|---|---|---|---|
| `1` | general (normal) | | `6` | education |
| `2` | favorite | | `7` | other |
| `3` | deleted (trash) | | `8` | personal |
| `4` | home | | `9` | archived |
| `5` | work | | `10` | pinned *(constant only; no active UI path)* |

#### How views map to `state`
- `fetchAll()` → `WHERE state != 3 AND state != 9` → **"All Notes"** shows everything
  **except trash (3) and archived (9)** — i.e. general, favourite, AND all categories.
- `fetchState(n)` → `WHERE state = n` → each category view, Favourites, Archived, Trash.
- `fetchReminds()` → `WHERE rem != '0'` → the Reminders view (orthogonal to `state`).
- `search(key)` → `WHERE notes LIKE %key%`.

#### Critical design flaw (a key reason to rebuild)
Because **category, favourite, archived, and trash all share the one `state` column, they are
mutually exclusive.** A note can be in exactly ONE of: general / a category (home/work/…) /
favourite / archived / trash. You **cannot** have a "favourite Home note" — favouriting it
overwrites its category (`changeState` just replaces `state`). The new model fixes this by
making these **independent fields** (see §6).

#### State transitions (verified)
- New note → `state = 1` (general; schema default).
- Category set via editor **Spinner** → `changeState(id, 1/4/5/6/7/8)`.
- Favourite → `changeState(id, 2)`; unfavourite → back to `1` (general). **Losing the category.**
- Archive → `changeState(id, 9)`; unarchive → `1`. Delete → `changeState(id, 3)`; restore → `1`.
- `restore_del()` (bulk) → `UPDATE ... SET state = 1 WHERE state = 3`.

#### Reminders (`rem` column)
- `rem` stores a date-time string (set via editor + date/time picker); `'0'` = no reminder.
- `BroadcastRec` fires an alarm/notification at the reminder time. Orthogonal to `state`.

#### Date/time storage (important for migration)
- `date` = `SimpleDateFormat(" ddMMM")` → e.g. `" 12Sep"` — **no year stored.**
- `time` = `SimpleDateFormat(" hh:mm a")` → e.g. `" 04:27 PM"`.
- Consequence: **the real calendar year of each note is unrecoverable.** But `_id` is an
  ascending integer, so **`_id` order = chronological order** for preserving relative ordering.

#### Known weaknesses being fixed
- `state` is badly overloaded → category/favourite/archive/trash are wrongly mutually exclusive.
- `date`/`time` are pre-formatted strings with **no year** → can't sort/filter by real time.
- No separate title (first line of body used as title in the list).
- All logic inside Activities, raw SQL, no tests.

---

## 3. Feature Scope (new app)

**MVP (Tier 1):**
- **All Notes** list (newest first): title + preview + relative date. Shows notes that are
  not archived and not trashed (mirrors old `fetchAll`, minus the category clutter).
- Create / edit / delete a note.
- **Favourite** (star) a note — independent flag; **Favourites** view.
- **Archive** / unarchive a note — independent flag; **Archived** view.
- **Trash**: soft-delete → **Trash** view with **Restore** and **Empty trash**; auto-purge
  after N days. (Plus a quick **Undo** toast right after deleting.)
- Share a note's text out to other apps.
- Receive text shared *into* the app from other apps (create a note).
- Dark mode (the project's spiritual origin — old package was literally `night`).
- Search notes (title + body).
- **Export / Import** all notes as a JSON file (backup / portability).
- Google Sign-In + automatic sync across phone & laptop.

> Note: favourite, archived, and trashed are now **independent** of each other (the old app
> wrongly made them mutually exclusive). A note can be a favourite *and* archived.

**Later (Tier 2, optional):**
- Two-pane desktop layout on web (list + editor side by side).
- Markdown or light rich-text.
- Pinned notes.
- Home-screen widget (native module).
- Client-side encryption (zero-knowledge) — see §8.
- Categories / tags (only if you ever want them back).

---

## 4. Tech Stack (LOCKED)

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript** | Type-safe across app, web, and data model. |
| Framework | **Expo (latest SDK)** | Abstracts native/Android churn; local builds free; OTA via EAS Update. |
| Rendering | **React Native + React Native Web** | One codebase → native Android + website. |
| Navigation | **Expo Router** | File-based routing, works on native and web (URLs/deep links free). |
| **UI / Styling** | **Tamagui** ✅ LOCKED | Universal design system: themes, tokens, dark mode; compiles to optimized native styles AND real CSS on web. (No Tailwind/NativeWind.) |
| Lists | **FlashList** (Shopify) | Native, high-performance list (replaces RecyclerView). |
| Animations / gestures | **Reanimated + Gesture Handler** | UI-thread animations = true native feel (swipe-to-archive, transitions). |
| Local state | **Zustand** | Tiny; Firestore handles data/sync state itself. |
| Backend | **Firebase: Firestore + Auth** | Offline cache + auto-sync; Security Rules; free Spark tier; no project pausing. |
| Firebase SDK | **Firebase JS SDK (modular v9+)** | Works on both native and web → one integration for the universal codebase. |
| Auth | **Google Sign-In** | One identity across phone + laptop; no passwords. |
| Icons | **lucide-react-native** / `@expo/vector-icons` | Minimal aesthetic. |
| Export/Import | JSON via `expo-file-system` (native) / Blob download (web) | Backup + anti-lock-in. |
| Build & updates | **EAS Build (local = free) + EAS Update** | Free OTA; bump Expo SDK ~2×/yr instead of chasing Android releases. |
| Web hosting | **Cloudflare Pages / Vercel / Netlify** | Free static hosting for web export. |
| Quality | TypeScript + ESLint + Prettier; **Maestro** for E2E | All free. |
| Migration | Node script + `better-sqlite3` | One-time import from old `Notes.db`. |

**Why Firebase (vs Supabase):** built-in offline persistence (true offline-first with least
code), no project pausing on free tier (fits sporadic personal use), declarative Security
Rules (more secure than a hand-rolled backend), free Auth. Trade-off accepted: Google
lock-in, softened by the export/import feature + repository abstraction.

**Why Firebase JS SDK (vs @react-native-firebase):** JS SDK runs on web *and* native, keeping
a single universal codebase. `@react-native-firebase` is native-only and would split the code.

---

## 5. Architecture

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  Android app (Expo / RN)     │     │  Web app (React Native Web,   │
│  native feel                 │     │  same codebase; responsive    │
│                              │     │  desktop layout)              │
└───────────────┬──────────────┘     └───────────────┬──────────────┘
                │                                      │
                └──────────────────┬───────────────────┘
                                   ▼
                       ┌──────────────────────┐
                       │  Repository layer     │  ← single interface, swappable
                       │  (NotesRepository)    │
                       └───────────┬───────────┘
                                   ▼
                       ┌──────────────────────┐
                       │  Firebase             │
                       │  • Firestore (offline │
                       │    cache + sync)      │
                       │  • Auth (Google)      │
                       └──────────────────────┘
```

**Layering rules:**
- **UI (screens/components)** never call Firebase directly — only the repository.
- **`NotesRepository`** is the single boundary to data. Swapping Firebase for something
  else later = reimplement one interface.
- **State:** Firestore real-time listeners feed a Zustand store; UI subscribes to the store.
- **Offline:** Firestore local persistence enabled; writes queue and sync automatically.
- **Platform branches:** use `Platform.OS` / responsive width for desktop-vs-phone layout;
  keep shared logic platform-agnostic.

---

## 6. Data Model

### Firestore structure
```
users/{uid}/notes/{noteId}
```
Each note document:
```ts
interface Note {
  id: string;            // uuid (sync-friendly; no auto-increment collisions)
  title: string;         // first line / explicit title
  body: string;          // remaining content
  isFavourite: boolean;  // independent flag
  isArchived: boolean;   // independent flag
  deletedAt: number | null; // non-null = in Trash (timestamp drives auto-purge after N days)
  createdAt: number;     // epoch millis
  updatedAt: number;     // epoch millis
  legacyDate?: string;   // OPTIONAL: original old-app date string (e.g. "12Sep 04:27 PM").
                         // Only set on notes imported from the old DB (year was never stored).
}
```

**View → query mapping (all scoped to the signed-in user):**
| View | Condition |
|---|---|
| All Notes | `deletedAt == null && !isArchived` |
| Favourites | `deletedAt == null && isFavourite` |
| Archived | `deletedAt == null && isArchived` |
| Trash | `deletedAt != null` |

`isFavourite` and `isArchived` are **independent** — fixing the old single-column flaw. Trash
takes precedence in the UI (a trashed note is hidden from the other views until restored).

### Security Rules (the core of "secure")
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/notes/{noteId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == uid;
    }
  }
}
```
Guarantees: unauthenticated users get nothing; each user can only ever read/write their own
notes — enforced server-side regardless of client code. (Note: this is private, not
end-to-end encrypted — see §8.)

---

## 7. Migration from the Old App

A **one-time Node script** (`scripts/migrate.ts`) imports existing notes from the old
`Notes.db`. The logic below is fully derived from the verified schema in §2.

### Confirmed migration rules
- **Preserve** favourites (`state 2`) and archived (`state 9`).
- **Collapse to normal notes:** general (`1`), home (`4`), work (`5`), education (`6`),
  other (`7`), personal (`8`), pinned (`10`).
- **Skip** old trash (`state 3`).
- **Drop reminders** entirely (ignore the `rem` column).

### Source query
```sql
SELECT _id, notes, date, time, state, rem
FROM Notes_Table
WHERE state != 3            -- skip trash
ORDER BY _id ASC;          -- ascending _id = chronological order (timestamps have no year)
```

### Per-row mapping → new `Note`
```ts
// pseudo-code for scripts/migrate.ts
const importedAt = Date.now();
let seq = 0;

function mapRow(row, totalRows): Note {
  // 1. Title/body split: old app used the first line as the visual title.
  const text = (row.notes ?? '').replace(/\r\n/g, '\n');
  const nl = text.indexOf('\n');
  const title = (nl === -1 ? text : text.slice(0, nl)).trim();
  const body  = nl === -1 ? '' : text.slice(nl + 1);

  // 2. Map old single `state` enum -> new independent flags.
  //    2 -> favourite ; 9 -> archived ; everything else (1,4,5,6,7,8,10) -> normal.
  //    (state 3 / trash already filtered out by the SQL WHERE clause.)
  const isFavourite = row.state === 2;
  const isArchived  = row.state === 9;

  // 3. Timestamps: real year is unrecoverable. Preserve ORDER via _id, not real dates.
  //    Synthetic strictly-increasing createdAt keeps newest-first ordering identical.
  const createdAt = importedAt - (totalRows - seq) * 1000;
  seq++;

  return {
    id: crypto.randomUUID(),
    title,
    body,
    isFavourite,
    isArchived,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    legacyDate: `${(row.date ?? '').trim()} ${(row.time ?? '').trim()}`.trim(), // e.g. "12Sep 04:27 PM"
  };
}
```

> `legacyDate` preserves the original human-readable date the old app showed (the true year
> is lost). The UI may show it subtly on migrated notes; otherwise harmless metadata.

### Source `Notes.db` — already in hand ✅
User already has the exported DB file. Verified facts:
- The old app's **Export feature is a raw SQLite file copy** (FileChannel/stream copy of
  `Notes.db`), **not** JSON — so the exported file **is** a plain `Notes.db`, read directly by
  `better-sqlite3`. No format conversion needed.
- **Only one table** (`Notes_Table`) and **one DB helper** exist in the whole codebase
  (verified via `git grep CREATE TABLE` / `SQLiteOpenHelper`). Nothing else is persisted.
- **No Firebase** in the latest `sourcecode` branch (removed later) — the local DB is the sole
  source of truth.
- Device path (for reference): `/data/data/sunny.app.csnotes/databases/Notes.db`.

### Destination (two options)
- **A — Direct Firestore write:** after first Google sign-in, write each mapped note to
  `users/{uid}/notes/{id}` via the Firebase Admin/client SDK. Clean one-shot import.
- **B — JSON file + in-app Import:** emit `notes-export.json` in the app's Import shape, then
  import on-device. Reuses the export/import code path, no admin credentials. **Recommended.**

### Accepted limitation
- **Timestamps:** real dates unrecoverable (no year stored). We preserve *order* via `_id` and
  keep the original string in `legacyDate`.

---

## 8. Security & Privacy Notes

- **In transit / at rest:** TLS + Google's at-rest encryption by default.
- **Access control:** Security Rules (§6) — only the owner can access their notes.
- **Auth:** Firebase Auth (Google Sign-In). No passwords stored by us.
- **Not end-to-end encrypted by default:** Google could technically read note contents at
  rest (same trust model as Google Keep / Drive). For most personal notes this is fine.
- **Optional zero-knowledge (Tier 2):** encrypt `body` on-device before upload so even Google
  can't read it. Adds key-management complexity; defer unless wanted.
- **Offline safety net retained:** export/import keeps a local copy you fully control.

---

## 9. Proposed Repo Structure

```
csnotes/
├── app/                      # Expo Router routes (screens)
│   ├── _layout.tsx           # root layout, theme provider, auth gate
│   ├── index.tsx             # All Notes (active, not archived/trashed)
│   ├── favourites.tsx        # favourited notes
│   ├── archived.tsx          # archived notes
│   ├── trash.tsx             # trash (restore / empty)
│   ├── note/[id].tsx         # editor (create/edit)
│   └── settings.tsx          # export/import, theme, sign-out
├── src/
│   ├── components/           # shared UI (NoteCard, Fab, EmptyState, SearchBar…)
│   ├── data/
│   │   ├── NotesRepository.ts # interface
│   │   ├── firebase.ts        # init (Auth + Firestore + offline persistence)
│   │   └── firestoreNotesRepo.ts # Firestore implementation
│   ├── store/                # Zustand stores
│   ├── theme/                # Tamagui config (tokens, light/dark themes)
│   ├── lib/                  # export/import, share intents, date format, uuid
│   └── types/                # Note, etc.
├── scripts/
│   └── migrate.ts            # one-time old-DB importer
├── tamagui.config.ts
├── app.json / app.config.ts  # Expo config
├── eas.json                  # EAS Build/Update config
├── tsconfig.json
├── .eslintrc / .prettierrc
└── PROJECT_PLAN.md           # this file
```

---

## 10. Roadmap (phased)

1. **Scaffold** — `create-expo-app` (TS) + Expo Router + Tamagui + Firebase init. Verify it
   runs on Android (native) and web from one codebase.
2. **Data layer** — `NotesRepository` interface + Firestore implementation; enable offline
   persistence; Security Rules deployed.
3. **Auth** — Google Sign-In + auth gate; per-user notes path.
4. **Notes list + editor** — create/edit/delete; native feel (FlashList, transitions).
5. **Favourite + Archive** — independent flags; Favourites & Archived views; swipe gestures (Reanimated).
6. **Trash** — soft-delete (Undo toast) → Trash view with Restore + Empty trash; auto-purge after N days.
7. **Search** — title + body.
8. **Share** — share out + receive shared text (Android intent / web share target).
9. **Dark mode** — Tamagui themes + system preference.
10. **Export / Import** — JSON backup + restore.
11. **Migration** — run `scripts/migrate.ts` to import existing notes.
12. **Web polish** — responsive desktop layout (two-pane later).
13. **Ship** — EAS Build (local/free) for Android; EAS Update for OTA; deploy web to
    Cloudflare Pages. Republish to Play Store only if/when desired.

---

## 11. Cost Reality Check (all $0 viable)

| Item | Free tier | Catch |
|---|---|---|
| Expo / EAS | Yes | Cloud builds limited/month → build locally for free. OTA free tier. |
| Firebase (Spark) | Yes, no card | Firestore + Auth generous for personal use; **no functions needed**; no pausing. |
| Web hosting | Yes | Cloudflare Pages / Vercel / Netlify. |

---

## 12. Open Decisions (to confirm before/at scaffold)

1. Web now = shared RN-Web (locked). Revisit a separate React+Vite web only if desktop UX
   demands it later.
2. (No blocking decisions remain — ready to scaffold.)

---

## 13. Decisions Already Locked

- **Name: CS Notes** (repo `csnotes`, display "CS Notes", package id **`com.sunny.csnotes`** —
  fresh Play listing; old app was `sunny.app.csnotes` / versionCode 335) ✅
- **UI/styling: Tamagui** ✅
- Universal codebase via **Expo + React Native Web** ✅
- Backend: **Firebase (Firestore + Auth)** ✅
- Firebase **JS SDK** (not @react-native-firebase) ✅
- Keep **normal + favourites + archived + trash + export/import**; drop **categories +
  reminders + pinned** ✅
- Favourite / archived / trashed are **independent flags** (fix old single-column flaw) ✅
- Migration: preserve favourites + archived; collapse categories/general/pinned → normal;
  skip old trash; drop reminders ✅
- **Auth: Google Sign-In** ✅
- Client-side encryption: **deferred to a future plan** (Tier 2) ✅
- Source `Notes.db` already exported and in hand (raw SQLite file) ✅
- Android + Web only (no iOS for now) ✅
