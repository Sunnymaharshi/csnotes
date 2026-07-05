@AGENTS.md

# CS Notes

Expo (Android) notes app on Firebase. See `PROJECT_PLAN.md` for scope, architecture,
data model, migration, and dependency policy.

## Gotchas

- Note = **single `text` field**, no title. UI never touches the backend directly — only
  `NotesRepository`; `useNotesWatcher` feeds it into the Zustand store.
- **Two repos, one interface** (PROJECT_PLAN §8.6): `app/_layout.tsx` picks `firestoreNotesRepo`
  (signed in) or `localNotesRepo` (guest, on-device SQLite). Guest flag lives in
  `authStore`; `syncGuest.signInAndSync` migrates guest notes into an account on login. Any repo
  change must land in **both** repos or it breaks one mode.
- **Sort** (§8.3) = `sortStore` (Created/Modified × asc/desc), one global setting; **layout**
  (list/grid) = `layoutStore`. Both persist to AsyncStorage. **No manual/drag sort** — dropped;
  `sortOrder` on `Note` is reserved/unused.
- **Bottom-nav** (§8.5) is an opt-in toggle (`bottomNavStore`, default OFF = top header). When
  ON: `HeaderStar` → `BottomBar` (All Notes/Favourites/Search + one hamburger → sectioned
  `BottomSheetSections` of actions + nav), header is title-only with
  **hamburger hidden + drawer swipe disabled** (`_layout` reads the store), selection → `BottomSelectionBar`,
  and overflow/nav/sort render as bottom `Modal`s (`BottomSheet`; `SortMenu` self-anchors to the
  bottom). FAB stays floating (raised above the bar). The branch lives in **both** `NoteListScreen.tsx`
  **and** `app/(drawer)/trash.tsx` (near-duplicates) — change both. When ON, `SafeAreaView` drops
  its `bottom` edge because the bars own that inset.
- **Auto-linkify** (§8.2): render note text via `LinkifiedText`; detection in `src/lib/linkify.ts`,
  actions (open/copy) in `src/lib/linkActions.ts` — shared by card previews and the editor.
- `isFavourite`/`isArchived` are independent fields; editor/bulk UI enforces mutual
  exclusivity by convention (old-app behavior).
- **No autosave-while-typing** (`app/note/[id].tsx`): saves fire only on ✓/back/unmount —
  force-closing mid-edit discards changes by design.
- Search is **per-view**, not global. Share-in (`expo-share-intent`, Android `text/*`) opens
  a prefilled new note under the same save rules; officially SDK ≤56, works on 57 with a
  harmless prebuild warning — check before bumping SDK.
- **Monochrome** = central theme swap in `tamagui.config.ts` (light/dark grayscale ramps
  `$color1`→`$color12`); use `$colorN` tokens, never hardcode. Header tint + `<StatusBar>`
  driven by `effectiveScheme` in `app/_layout.tsx` (`primaryText` export).
- **Icons**: `lucide-react-native` via `src/lib/icons.ts` (`ICON` sizes + `ICON_STROKE`);
  favourite is always `Star`.
- **Feedback centralized** — `src/lib/haptics.ts` (tap/longPress/press/success/warning) +
  `src/lib/toast.ts` (`showToast`). Each mutation confirms once: toast for non-visible
  changes, haptic+visual for visible (don't double-signal). `PressableScale`
  (`src/components`) is the standard tappable — prefer over raw `Pressable`. `expo-haptics`
  is native → rebuild after install.
- **Perf**: read store counts via numeric selectors (`s => s.trash.length`), not array
  subscriptions. FlashList is v2 — no `estimatedItemSize`.
- Reanimated v4 needs `react-native-worklets/plugin` (last in `babel.config.js`); `--clear`
  Metro after babel changes. Native-only code lives in `*.native.ts`.
- Deps pinned to what `npx expo install --check` / `npx expo-doctor` expect — don't chase
  `npm outdated`. `package.json` `"overrides"` dedupe `expo-share-intent`/`react-dom`
  without `--legacy-peer-deps`; re-check both after changes.
- Migration (`node scripts/migrate.ts`, `Notes.db` → `notes-export.json` for in-app Import,
  PROJECT_PLAN §7): `createdAt` is synthesized to climb with old `_id` (preserves old
  `_id DESC` order under Created-desc sort); `updatedAt` = real edit date (shown on cards).
- Typecheck: `node node_modules/typescript/lib/tsc.js --noEmit`.
