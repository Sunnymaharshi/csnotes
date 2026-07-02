@AGENTS.md

# CS Notes

Expo (Android) notes app on Firebase. See `PROJECT_PLAN.md` for scope, architecture,
data model, migration, and dependency policy.

## Gotchas

- Note = **single `text` field**, no title. UI never calls Firebase directly — only
  `NotesRepository`; `useNotesWatcher` feeds Firestore data into the Zustand store.
- `isFavourite`/`isArchived` are independent fields, but editor/bulk-action UI still
  enforces mutual exclusivity by convention (old-app-compatible behavior).
- **No autosave-while-typing** (`app/note/[id].tsx`): saves only fire on ✓, back
  navigation, or unmount — force-closing the app mid-edit discards changes by design.
- Search is **per-view**, not global — each screen filters only its own note list.
- Share-in (`expo-share-intent`, Android `text/*`) opens a prefilled new note via the
  same save rules above; only officially supports SDK ≤56, works on 57 with a harmless
  prebuild warning — check it before bumping SDK.
- Monochrome look is a **central theme swap** in `tamagui.config.ts`; use `$colorN`
  tokens, never hardcode colors.
- Reanimated v4 needs `react-native-worklets/plugin` (last entry in `babel.config.js`);
  `--clear` Metro after babel changes.
- Native-only code lives in `*.native.ts` files (Google Sign-In, file system).
- Dependency versions are pinned to what `npx expo install --check` / `npx expo-doctor`
  expect for the SDK — don't chase `npm outdated`'s "latest". `package.json`
  `"overrides"` keep `expo-share-intent` and `react-dom` deduped without
  `--legacy-peer-deps`; re-check both commands after any dependency change.
- Migration from the old SQLite DB: `scripts/migrate.ts` (`node scripts/migrate.ts`) reads
  `scripts/Notes.db` and emits `scripts/notes-export.json` for in-app Import (PROJECT_PLAN §7).
- Typecheck: `node node_modules/typescript/lib/tsc.js --noEmit`.
