import { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Share,
  Pressable,
  Alert,
  ToastAndroid,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Star, Archive, ArchiveRestore, Check, Share2, Trash2 } from 'lucide-react-native';
import { useNotesStore } from '../../src/store/notesStore';
import { fullDateTime } from '../../src/lib/compactDate';
import type { NotesRepository } from '../../src/data/NotesRepository';
import { randomUUID } from '../../src/lib/uuid';

function NoteHeaderRight({
  onDone,
}: {
  onDone: () => void;
}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const repo = useNotesStore((s) => s.repo) as NotesRepository;
  const note = useNotesStore(
    (s) => s.allNotes.find((n) => n.id === id) ?? s.archived.find((n) => n.id === id),
  );
  const isNew = id === 'new';
  const isArchived = note?.isArchived ?? false;
  const iconColor = theme.color12.val;

  async function handleArchive() {
    if (isNew) { ToastAndroid.show('Save the note first', ToastAndroid.SHORT); return; }
    if (!repo || !note) return;
    await repo.updateNote(id, { isArchived: !isArchived });
    onDone();
  }

  return (
    <XStack alignItems="center" gap="$1" paddingRight="$2">
      <Pressable onPress={handleArchive} hitSlop={8} style={styles.headerBtn}>
        {isArchived ? (
          <ArchiveRestore size={22} color={iconColor} />
        ) : (
          <Archive size={22} color={iconColor} />
        )}
      </Pressable>
      <Pressable onPress={onDone} hitSlop={8} style={styles.headerBtn}>
        <Check size={24} color={iconColor} />
      </Pressable>
    </XStack>
  );
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const repo = useNotesStore((s) => s.repo);
  const setTrashUndo = useNotesStore((s) => s.setTrashUndo);

  const note = useNotesStore(
    (s) =>
      s.allNotes.find((n) => n.id === id) ??
      s.archived.find((n) => n.id === id) ??
      s.favourites.find((n) => n.id === id),
  );

  const [text, setText] = useState('');
  const [initialized, setInitialized] = useState(false);
  const originalTextRef = useRef('');

  useEffect(() => {
    if (isNew && !initialized) {
      setInitialized(true);
    } else if (!isNew && note && !initialized) {
      setText(note.text);
      originalTextRef.current = note.text;
      setInitialized(true);
    }
  }, [note, initialized, isNew]);

  const textRef = useRef('');
  textRef.current = text;
  const repoRef = useRef(repo);
  useEffect(() => { repoRef.current = repo; }, [repo]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef(false);

  const flushSave = useRef(async (noteId: string) => {
    if (!pendingSave.current || !repoRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    await repoRef.current.updateNote(noteId, { text: textRef.current });
    pendingSave.current = false;
  });

  function handleChange(value: string) {
    setText(value);
    pendingSave.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!isNew) {
      saveTimerRef.current = setTimeout(async () => {
        if (repoRef.current && id) {
          await repoRef.current.updateNote(id, { text: value });
          pendingSave.current = false;
        }
      }, 600);
    }
  }

  // Called when user taps Check (tick)
  async function handleDone() {
    if (isNew) {
      const content = textRef.current.trim();
      if (!content) {
        // Empty new note — confirm discard
        Alert.alert(
          'Empty Note',
          'Discard this empty note?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          ],
        );
        return;
      }
      // Create the note now
      if (!repoRef.current) return;
      const newId = randomUUID();
      await repoRef.current.createNote({
        text: textRef.current,
        isFavourite: false,
        isArchived: false,
        deletedAt: null,
      });
      pendingSave.current = false;
      router.back();
    } else {
      await flushSave.current(id);
      router.back();
    }
  }

  // Intercept hardware back / gesture
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      const content = textRef.current.trim();
      const isDirty = isNew ? content.length > 0 : pendingSave.current;
      const isEmpty = content.length === 0;

      if (isNew && isEmpty) {
        // Empty new note — confirm discard
        e.preventDefault();
        Alert.alert(
          'Discard Note?',
          'This note is empty and won\'t be saved.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ],
        );
        return;
      }

      if (isNew && isDirty) {
        e.preventDefault();
        Alert.alert(
          'Save Note?',
          '',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
            {
              text: 'Save',
              onPress: async () => {
                if (repoRef.current) {
                  await repoRef.current.createNote({
                    text: textRef.current,
                    isFavourite: false,
                    isArchived: false,
                    deletedAt: null,
                  });
                }
                navigation.dispatch(e.data.action);
              },
            },
          ],
        );
        return;
      }

      if (!isNew && isDirty) {
        e.preventDefault();
        Alert.alert(
          'Unsaved Changes',
          'Save changes before exiting?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                pendingSave.current = false;
                navigation.dispatch(e.data.action);
              },
            },
            {
              text: 'Save',
              onPress: async () => {
                await flushSave.current(id);
                navigation.dispatch(e.data.action);
              },
            },
          ],
        );
      }
    });
    return unsubscribe;
  }, [navigation, id, isNew]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <NoteHeaderRight onDone={handleDone} />,
    });
  }, [navigation, id]);

  // Flush pending save on unmount (existing notes only)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (!isNew && pendingSave.current && repoRef.current && id) {
        repoRef.current.updateNote(id, { text: textRef.current });
      }
    };
  }, [id, isNew]);

  function toastNotSaved() {
    ToastAndroid.show('Save the note first', ToastAndroid.SHORT);
  }

  async function handleFavourite() {
    if (isNew) { toastNotSaved(); return; }
    if (!repoRef.current || !note) return;
    await repoRef.current.updateNote(id, { isFavourite: !note.isFavourite });
  }

  async function handleShare() {
    await Share.share({ message: textRef.current.trim() || 'Empty note' });
  }

  async function handleDelete() {
    if (isNew) { toastNotSaved(); return; }
    if (!repoRef.current || !id) return;
    await flushSave.current(id);
    await repoRef.current.trashNote(id);
    const firstLine = textRef.current.split('\n')[0].trim();
    setTrashUndo({ id, label: firstLine || 'Untitled' });
    router.back();
  }

  const isFavourite = note?.isFavourite ?? false;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
            label="favourite"
            icon={
              <Star
                size={22}
                color={isFavourite ? theme.color12.val : theme.color10.val}
                fill={isFavourite ? theme.color12.val : 'none'}
              />
            }
            onPress={handleFavourite}
          />
          <BottomAction
            label="share"
            icon={<Share2 size={22} color={theme.color10.val} />}
            onPress={handleShare}
          />
          <BottomAction
            label="delete"
            icon={<Trash2 size={22} color={theme.color10.val} />}
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
