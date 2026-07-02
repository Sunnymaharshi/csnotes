import { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Share,
  Pressable,
  Keyboard,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Star, Archive, ArchiveRestore, Check, Share2, Trash2 } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../../src/lib/icons';
import { useNotesStore } from '../../src/store/notesStore';
import { fullDateTime } from '../../src/lib/compactDate';
import { confirmDeleteNoteForever } from '../../src/lib/globalOverflowActions';
import { randomUUID } from '../../src/lib/uuid';
import { showToast } from '../../src/lib/toast';
import { tapFeedback, successFeedback, warningFeedback } from '../../src/lib/haptics';
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
  // mutually exclusive).
  async function handleArchive() {
    if (!targetId) { showToast('Save the note first'); return; }
    if (!repo || !note) return;
    await repo.updateNote(targetId, {
      isArchived: !isArchived,
      isFavourite: isArchived ? note.isFavourite : false,
      deletedAt: null,
    });
    tapFeedback();
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
  const originalTextRef = useRef('');

  useEffect(() => {
    if (isNew && !initialized) {
      if (sharedText) {
        // Shared-in text counts as unsaved content, same as if the user had
        // typed it: back navigation saves it, force-closing the app discards it.
        setText(sharedText);
        pendingSave.current = true;
      }
      setInitialized(true);
    } else if (!isNew && note && !initialized) {
      setText(note.text);
      originalTextRef.current = note.text;
      setInitialized(true);
    }
  }, [note, initialized, isNew, sharedText]);

  const textRef = useRef('');
  textRef.current = text;
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
      successFeedback();
      showToast('Saved');
    } else {
      const targetId = isNew ? createdIdRef.current : id;
      if (!targetId) return;
      await repoRef.current.updateNote(targetId, { text: content });
      successFeedback();
      showToast('Updated');
    }
  });

  // No autosave while typing — a save only happens via the tick button,
  // navigating back, or unmount, so closing the app mid-edit discards changes.
  function handleChange(value: string) {
    setText(value);
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
    tapFeedback();
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <XStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$1" justifyContent="flex-end">
          <Text fontSize="$2" color="$color9">
            {note ? fullDateTime(note.updatedAt) : ''}
          </Text>
        </XStack>

        <TextInput
          style={[styles.body, { color: theme.color12.val }]}
          placeholder="Start writing…"
          placeholderTextColor={theme.color9.val}
          value={text}
          onChangeText={handleChange}
          multiline
          textAlignVertical="top"
          autoFocus={initialized && text.length === 0}
        />

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
      </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
});
