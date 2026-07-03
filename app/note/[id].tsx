import { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  Platform,
  Share,
  Pressable,
  Keyboard,
  ScrollView,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { LinkifiedText } from '../../src/components/LinkifiedText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Star, Archive, ArchiveRestore, Check, Share2, Trash2 } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../../src/lib/icons';
import { useNotesStore } from '../../src/store/notesStore';
import { fullDateTime } from '../../src/lib/compactDate';
import { confirmDeleteNoteForever } from '../../src/lib/globalOverflowActions';
import { randomUUID } from '../../src/lib/uuid';
import { showToast } from '../../src/lib/toast';
import { warningFeedback } from '../../src/lib/haptics';
import type { NotesRepository } from '../../src/data/NotesRepository';

function NoteHeaderRight({
  targetId,
  onDone,
}: {
  targetId: string | null;
  onDone: (opts?: { silent?: boolean }) => void;
}) {
  const theme = useTheme();
  const repo = useNotesStore((s) => s.repo) as NotesRepository;
  const note = useNotesStore(
    (s) =>
      s.allNotes.find((n) => n.id === targetId) ??
      s.archived.find((n) => n.id === targetId) ??
      s.trash.find((n) => n.id === targetId),
  );
  const isArchived = note?.isArchived ?? false;
  const iconColor = theme.color12.val;

  // Archiving is the last action the user took, so it always wins: it un-trashes
  // the note (if it was trashed) and un-favourites it (isFavourite/isArchived are
  // mutually exclusive). Archiving also clears the pin — an archived note leaves
  // All Notes, so its pin has nowhere to render (§8.1).
  async function handleArchive() {
    if (!targetId) { showToast('Save the note first'); return; }
    if (!repo || !note) return;
    await repo.updateNote(targetId, {
      isArchived: !isArchived,
      isFavourite: isArchived ? note.isFavourite : false,
      ...(isArchived ? {} : { isPinned: false }),
      deletedAt: null,
    });
    showToast(isArchived ? 'Unarchived' : 'Archived');
    // Flush any pending text edits, but silently — 'Archived' is already the
    // one toast this action should produce, so don't also surface "No new
    // changes" for the common case of archiving without editing.
    onDone({ silent: true });
  }

  return (
    <XStack alignItems="center" gap="$1" paddingRight="$2">
      <Pressable onPress={handleArchive} hitSlop={8} style={styles.headerBtn}>
        {isArchived ? (
          <ArchiveRestore size={ICON.md} strokeWidth={ICON_STROKE} color={iconColor} />
        ) : (
          <Archive size={ICON.md} strokeWidth={ICON_STROKE} color={iconColor} />
        )}
      </Pressable>
      <Pressable onPress={() => onDone()} hitSlop={8} style={styles.headerBtn}>
        <Check size={ICON.lg} strokeWidth={ICON_STROKE} color={iconColor} />
      </Pressable>
    </XStack>
  );
}

export default function NoteScreen() {
  const { id, sharedText } = useLocalSearchParams<{
    id: string;
    sharedText?: string;
  }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const repo = useNotesStore((s) => s.repo);

  const [savedId, setSavedId] = useState<string | null>(null);
  const targetId = isNew ? savedId : id;

  const note = useNotesStore(
    (s) =>
      s.allNotes.find((n) => n.id === targetId) ??
      s.archived.find((n) => n.id === targetId) ??
      s.favourites.find((n) => n.id === targetId) ??
      s.trash.find((n) => n.id === targetId),
  );

  const [text, setText] = useState('');
  const [initialized, setInitialized] = useState(false);
  // An existing note opens in a read view (linkified, tappable); tapping the
  // body switches to editing. New/empty notes go straight to the editor.
  const [editing, setEditing] = useState(false);
  // One-shot caret target used when entering edit: end of the note for a plain-text
  // tap, or just after a link when its menu "Edit" is chosen. Held through mount +
  // focus, then released on a timer so it never fights the cursor. null = the input
  // manages its own selection.
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Expo SDK 57 is edge-to-edge, where Android's adjustResize no longer shrinks the
  // window — so KeyboardAvoidingView (behavior:undefined on Android) left the bottom
  // of long notes hidden behind the keyboard. Drive layout off real keyboard events
  // instead and pad the editor up above the keyboard. SafeAreaView already reserves
  // insets.bottom, so subtract it to avoid double-counting.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (isNew && !initialized) {
      if (sharedText) {
        // Shared-in text counts as unsaved content, same as if the user had
        // typed it: back navigation saves it, force-closing the app discards it.
        setText(sharedText);
        textRef.current = sharedText;
        pendingSave.current = true;
      }
      setEditing(true);
      setInitialized(true);
    } else if (!isNew && note && !initialized) {
      setText(note.text);
      textRef.current = note.text;
      setEditing(note.text.trim().length === 0);
      setInitialized(true);
    }
  }, [note, initialized, isNew, sharedText]);

  // Enter edit with the caret at `offset` (clamped on the input; focus itself is
  // driven by the effect below, after the input mounts). The link menu's "Edit"
  // passes the offset just after the tapped link; plain-text taps use enterEdit,
  // which lands the caret at the end of the note.
  function enterEditAt(offset: number) {
    setPendingCaret(offset);
    setEditing(true);
  }
  function enterEdit() {
    enterEditAt(textRef.current.length);
  }

  // Open the keyboard whenever we enter edit mode. Runs after the TextInput has
  // committed (so the ref is set), and a short delay lets the link menu's Modal
  // finish dismissing before we focus — otherwise the keyboard is dropped when
  // Edit is chosen from that menu. Skipped for a fresh note, which uses
  // autoFocus on mount instead.
  useEffect(() => {
    if (!editing || isNew) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [editing, isNew]);

  // Release the one-shot caret target once focus has landed and the caret is
  // placed — after this the selection prop goes uncontrolled so normal taps and
  // typing move the cursor freely. Clearing on a timer (not onSelectionChange,
  // which fires before focus and would defeat the placement) keeps it reliable.
  useEffect(() => {
    if (pendingCaret == null) return;
    const t = setTimeout(() => setPendingCaret(null), 250);
    return () => clearTimeout(t);
  }, [pendingCaret]);

  // The editor's TextInput is uncontrolled (defaultValue + onChangeText), so this
  // ref — not the `text` state — is the live source of truth for what the user has
  // typed. It's kept in lockstep in handleChange, seeded in the init effect, and
  // pushed back into `text` state only when leaving edit mode (so the read view and
  // a fresh editor mount both pick up the latest content). Keeping typing off the
  // React render path is what makes editing large notes smooth.
  const textRef = useRef('');
  const repoRef = useRef(repo);
  useEffect(() => { repoRef.current = repo; }, [repo]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef(false);
  // Once a "new" note has been created, this holds its real id so further
  // saves update that note instead of creating duplicates.
  const createdIdRef = useRef<string | null>(null);

  // Creates the note on first save, updates it on every save after that.
  // The id is claimed synchronously (before any await) so a second save
  // triggered while the first is still in flight (e.g. offline, where the
  // write promise can take a while to settle) updates the same doc instead
  // of racing to create a duplicate.
  // Toasting from here (rather than each caller) means every save path —
  // autosave, the tick button, back navigation, unmount flush — reports
  // consistently, even when the save is fired-and-forgotten (e.g. offline back).
  const saveNow = useRef(async () => {
    if (!repoRef.current) return;
    const content = textRef.current;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Claimed synchronously (before any await) so a second save triggered while
    // this one is still in flight — e.g. beforeRemove kicking off the save and
    // then dispatching navigation, which unmounts the screen and runs the
    // unmount-flush effect before this await resolves — sees nothing pending
    // and doesn't fire a duplicate save/toast.
    pendingSave.current = false;
    if (isNew && !createdIdRef.current) {
      if (!content.trim()) return;
      const newId = randomUUID();
      createdIdRef.current = newId;
      setSavedId(newId);
      await repoRef.current.createNote({
        id: newId,
        text: content,
        isFavourite: false,
        isArchived: false,
        deletedAt: null,
      });
      showToast('Saved');
    } else {
      const targetId = isNew ? createdIdRef.current : id;
      if (!targetId) return;
      await repoRef.current.updateNote(targetId, { text: content });
      showToast('Updated');
    }
  });

  // No autosave while typing — a save only happens via the tick button,
  // navigating back, or unmount, so closing the app mid-edit discards changes.
  // The input is uncontrolled, so record keystrokes on the ref (not state) to
  // keep typing off the render path — `text` is resynced when we leave edit mode.
  function handleChange(value: string) {
    textRef.current = value;
    pendingSave.current = true;
  }

  // Called when user taps Check (tick) — saves in place, stays on screen.
  // `silent` is used when another action (e.g. archive) already toasted and
  // just needs pending edits flushed, without an extra "No new changes" toast.
  async function handleDone(opts?: { silent?: boolean }) {
    Keyboard.dismiss();
    const content = textRef.current.trim();
    if (isNew && !createdIdRef.current && !content) {
      if (!opts?.silent) showToast('Note cannot be empty');
      return;
    }
    // Non-empty note: leave the editor for the read view so links are tappable.
    // Push the ref's live text into state so the read view (and a later editor
    // re-mount, which seeds from `text` via defaultValue) shows the latest edits.
    setText(textRef.current);
    setEditing(false);
    if (!pendingSave.current) {
      if (!opts?.silent) showToast('No new changes');
      return;
    }
    saveNow.current();
  }

  // Intercept hardware back / gesture
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      const content = textRef.current.trim();
      const isEmpty = content.length === 0;

      if (isNew && !createdIdRef.current && isEmpty) {
        // Never saved and nothing to save — silently discard
        return;
      }

      if (pendingSave.current) {
        // Kick off the save (create once, then update) but don't block
        // leaving on it — Firestore applies the write to the local cache
        // and this screen's watchers immediately, so there's no need to
        // wait for the server ack (which can hang indefinitely offline).
        e.preventDefault();
        saveNow.current();
        navigation.dispatch(e.data.action);
      }
    });
    return unsubscribe;
  }, [navigation, id, isNew]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <NoteHeaderRight targetId={targetId} onDone={handleDone} />,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, id, targetId]);

  // Reflect the read/edit mode in the header title.
  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit Note' : 'My Notes' });
  }, [navigation, editing]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingSave.current) {
        saveNow.current();
      }
    };
  }, [id, isNew]);

  function toastNotSaved() {
    showToast('Save the note first');
  }

  const isTrashed = note?.deletedAt != null;

  // Favouriting is the last action the user took, so it always wins: it un-trashes
  // the note (if it was trashed) and un-archives it (isFavourite/isArchived are
  // mutually exclusive).
  async function handleFavourite() {
    if (!targetId) { toastNotSaved(); return; }
    if (!repoRef.current || !note) return;
    const nowFavourite = !note.isFavourite;
    await repoRef.current.updateNote(targetId, {
      isFavourite: nowFavourite,
      isArchived: note.isFavourite ? note.isArchived : false,
      deletedAt: null,
    });
    showToast(nowFavourite ? 'Added to favourites' : 'Removed from favourites');
  }

  async function handleShare() {
    await Share.share({ message: textRef.current.trim() || 'Empty note' });
  }

  function handleDelete() {
    if (!targetId) { toastNotSaved(); return; }
    if (!repoRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // Any unsaved edits are moot once the note is trashed/deleted — clear the
    // flag so beforeRemove's flush-on-back doesn't resurrect stale content
    // into the doc after it's gone.
    pendingSave.current = false;
    if (isTrashed) {
      // Already in trash — this permanently deletes it, so confirm first.
      confirmDeleteNoteForever(async () => {
        await repoRef.current!.deleteNote(targetId);
        warningFeedback();
        showToast('Deleted');
        router.back();
      });
      return;
    }
    (async () => {
      await repoRef.current!.trashNote(targetId);
      warningFeedback();
      showToast('Moved to trash');
      router.back();
    })();
  }

  const isFavourite = note?.isFavourite ?? false;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.color1.val }]} edges={['bottom']}>
      <YStack flex={1} paddingBottom={Math.max(0, kbHeight - insets.bottom)}>
        <XStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$1" justifyContent="flex-end">
          <Text fontSize="$2" color="$color9">
            {note ? fullDateTime(note.updatedAt) : ''}
          </Text>
        </XStack>

        {editing ? (
          <TextInput
            ref={inputRef}
            style={[styles.body, { color: theme.color12.val }]}
            placeholder="my notes"
            placeholderTextColor={theme.color9.val}
            // Uncontrolled: defaultValue seeds from state at mount, then
            // onChangeText tracks edits on textRef so typing doesn't re-render.
            defaultValue={text}
            onChangeText={handleChange}
            multiline
            textAlignVertical="top"
            // Drop the caret at the tapped line on entry (see pendingCaret),
            // clamped to the text length. Held (controlled) through mount + focus,
            // then released on a timer so it never fights normal cursor moves.
            // Typing doesn't re-render (uncontrolled value), so a static selection
            // here doesn't yank the caret while the user edits.
            selection={
              pendingCaret != null
                ? { start: Math.min(pendingCaret, text.length), end: Math.min(pendingCaret, text.length) }
                : undefined
            }
            // New notes focus on mount; existing notes are focused by the
            // enter-edit effect (which also handles the link-menu Edit path).
            autoFocus={isNew}
          />
        ) : (
          // Read view: linkified + selectable. A tap on plain text falls through
          // to the Pressable and enters edit with the caret at the end of the note;
          // a tap on a link opens the menu (the link span consumes the touch), and
          // its "Edit" enters edit with the caret just after that link. Long-press
          // still selects text, so linkifying doesn't cost text selection.
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.readContent}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable style={styles.flex} onPress={enterEdit}>
              <LinkifiedText
                text={text}
                onEditLinkAt={enterEditAt}
                selectable
                fontSize={17}
                lineHeight={25}
                color="$color12"
                // Match the editor (which also drops Android font padding) so
                // text doesn't shift between read and edit modes.
                style={{ includeFontPadding: false }}
              />
            </Pressable>
          </ScrollView>
        )}

        {/* Hide the action bar whenever the keyboard is up — while typing we want
            the full height for the note, and the bar's actions aren't needed mid-edit. */}
        {kbHeight === 0 ? (
        <XStack
          borderTopWidth={1}
          borderTopColor="$color4"
          paddingVertical="$2"
          justifyContent="space-around"
          alignItems="center"
        >
          <BottomAction
            label="Favourite"
            icon={
              <Star
                size={ICON.md}
                strokeWidth={ICON_STROKE}
                color={isFavourite ? theme.color12.val : theme.color10.val}
                fill={isFavourite ? theme.color12.val : 'none'}
              />
            }
            onPress={handleFavourite}
          />
          <BottomAction
            label="Share"
            icon={<Share2 size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color10.val} />}
            onPress={handleShare}
          />
          <BottomAction
            label={isTrashed ? 'Delete forever' : 'Delete'}
            icon={<Trash2 size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color10.val} />}
            onPress={handleDelete}
          />
        </XStack>
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}

function BottomAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <YStack alignItems="center" gap="$1" paddingHorizontal="$4" paddingVertical="$1">
        {icon}
        <Text fontSize="$2" color="$color10">
          {label}
        </Text>
      </YStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerBtn: { paddingHorizontal: 6 },
  body: {
    flex: 1,
    fontSize: 17,
    lineHeight: 25,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
    // Android multiline TextInputs add internal top/font padding the read-mode
    // Text lacks, which nudges the text down on entering edit mode — drop it so
    // the two modes align pixel-for-pixel.
    includeFontPadding: false,
  },
  readContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
});
