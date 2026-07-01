# CS Notes

An **Android** notes app backed by **Firebase**, rebuilt from an old Java + SQLite notepad.
Offline-first, private (only the owner reads their notes), and free to host.

- **Google Sign-In** with automatic real-time Firestore sync across devices.
- Works fully **offline** — notes load from disk, writes queue and sync when back online.
- **Monochrome** black-and-white look with dark mode.

> A future web app can connect to the same Firebase project with zero backend changes.

See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the full scope, data model, and migration notes.

---

## Features

- **All Notes** list (newest first), excluding archived and trashed.
- Create / edit / delete a note — a note is a **single text field** (no title), auto-saved.
- **Favourite** and **Archive** as independent flags.
- **Trash**: soft-delete with an Undo toast → Trash view (Restore / Empty trash).
- **Search** note text and **Share** a note out.
- **Export / Import** all notes as JSON (your own backup, no lock-in).
- **Dark mode** + monochrome styling.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | Expo SDK 57 + Expo Router (file-based routing) |
| UI | Tamagui (monochrome themes in `tamagui.config.ts`) |
| Navigation | Expo Router Stack + Drawer |
| Lists | FlashList |
| Animation | Reanimated v4 (needs `react-native-worklets/plugin`) |
| State | Zustand |
| Backend | Firebase Firestore + Auth (`@react-native-firebase`) |
| Auth (native) | `@react-native-google-signin/google-signin` |
| Icons | lucide-react-native |

`@react-native-firebase` (native Firebase SDK) is used instead of the Firebase JS SDK for
full offline disk persistence and automatic write queuing on Android.

> **Expo Go is not supported.** The native modules (`@react-native-firebase`,
> `@react-native-google-signin`, Reanimated v4) require a compiled development build.

---

## Architecture

```
UI (screens/components)  →  NotesRepository  →  @react-native-firebase (Firestore + Auth)
                                  ▲                        ↕ disk cache, auto-sync
                         Zustand store ← real-time watchers (useNotesWatcher)
```

- The UI **never** calls Firebase directly — only through `NotesRepository`.
- Firestore listeners feed the Zustand store; the UI subscribes to the store.
- Firestore offline persistence is on by default; writes queue and sync automatically.

**Offline behaviour:**
- Notes load from local disk even with no internet.
- Edits made offline are queued and synced to Firestore when connectivity returns.

**Data model** — Firestore path `users/{uid}/notes/{noteId}`:

```ts
interface Note {
  id: string;
  text: string;             // single content field (no separate title)
  isFavourite: boolean;     // independent flag
  isArchived: boolean;      // independent flag
  deletedAt: number | null; // non-null = in Trash
  createdAt: number;        // epoch millis
  updatedAt: number;        // epoch millis
}
```

Security rules (`firestore.rules`) restrict each user to their own notes. Private, but not
end-to-end encrypted (Google can read at rest, like Google Keep).

### Repo layout

```
app/                     screens (Expo Router)
  _layout.tsx            root Stack + auth gate + theme provider
  sign-in.tsx            Google Sign-In
  note/[id].tsx          editor
  (drawer)/              All Notes / Favourites / Archived / Trash / Settings
src/
  components/            NoteCard, EmptyState, OverflowMenu
  data/                  NotesRepository, firebase, firestoreNotesRepo
  store/                 notesStore, themeStore
  hooks/                 useNotesWatcher
  lib/                   exportImport, googleAuth, compactDate, uuid
  types/                 Note
tamagui.config.ts        monochrome light/dark themes
firestore.rules          Firestore security rules
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- A **Firebase project** with Firestore and Google Auth enabled
- **Android Studio** with an emulator, or a physical Android device via USB

### 1. Install

```bash
npm install
```

### 2. Configure Firebase

Copy the example env and fill in your Firebase web config values:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

Place `google-services.json` (downloaded from Firebase Console → Project Settings → Android app)
at the repo root. It is already referenced by `app.json`.

Deploy Firestore rules and indexes:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

### 3. Add your debug SHA-1 to Firebase

Google Sign-In requires the debug keystore fingerprint to be registered:

```bash
keytool -list -v \
  -keystore android/app/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android \
  | grep SHA1
```

Add the SHA-1 in Firebase Console → Project Settings → Your Android app → **Add fingerprint**,
then re-download `google-services.json`.

### 4. Build and run

**First time** — compile the native dev build (required once, or after adding native packages):

```bash
npm run android:build             # emulator
npm run android:build -- --device # physical phone via USB (enable USB debugging first)
```

**After that**, just start Metro and the installed dev build connects automatically:

```bash
npm run android
```

> After changing `babel.config.js`, restart Metro with: `npm run start:clear`

---

## Type Checking

```bash
npm run typecheck
```

---

## Deployment

Build profiles live in `eas.json` (`development`, `preview`, `production`).

```bash
npx eas-cli login

# Internal test APK
npx eas-cli build --platform android --profile preview

# Play Store app bundle (.aab)
npx eas-cli build --platform android --profile production

# Submit to Google Play
npx eas-cli submit --platform android --profile production
```

Ship fixes over-the-air without a new store release:

```bash
npx eas-cli update --branch production --message "Fix X"
```

---

## License

See [`LICENSE`](./LICENSE).
