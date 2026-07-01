@AGENTS.md

# CS Notes

Universal Expo (Android + Web) notes app on Firebase. See `PROJECT_PLAN.md` for scope,
architecture, data model, and migration.

## Gotchas

- A note is a **single `text` field** — there is no separate title/body.
- UI talks only to `NotesRepository`, never Firebase directly. Firestore watchers
  (`useNotesWatcher`) feed the Zustand store.
- Monochrome look is a **central theme swap** in `tamagui.config.ts`; screens use `$colorN`
  tokens, so don't hardcode colors.
- Reanimated v4 requires `react-native-worklets/plugin` (last entry in `babel.config.js`);
  restart Metro with `--clear` after babel changes.
- Native-only code lives in `*.native.ts` files (Google Sign-In, file system) so the web
  build stays clean.
- Migration from the old SQLite DB is **deferred** (see PROJECT_PLAN §7).
- Typecheck with `node node_modules/typescript/lib/tsc.js --noEmit`.
