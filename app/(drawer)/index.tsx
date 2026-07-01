import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, XStack, Text, Button, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { Star, Search, X, Trash2, Download, Upload } from 'lucide-react-native';
import { useNotesStore } from '../../src/store/notesStore';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { OverflowMenu } from '../../src/components/OverflowMenu';
import { exportNotes, pickAndImportNotes } from '../../src/lib/exportImport';
import { compactDate } from '../../src/lib/compactDate';
import type { Note } from '../../src/types/Note';

type Category = 'all' | 'favourites' | 'archived' | 'trash';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'archived', label: 'Archived' },
  { key: 'trash', label: 'Trash' },
];

const EMPTY_LABELS: Record<Category, string> = {
  all: 'No Notes',
  favourites: 'No Favourites',
  archived: 'Nothing Archived',
  trash: 'Trash is Empty',
};

function TrashCard({ note, onRestore }: { note: Note; onRestore: (id: string) => void }) {
  return (
    <YStack
      backgroundColor="$color2"
      borderRadius="$4"
      padding="$3"
      gap="$1"
      borderWidth={1}
      borderColor="$color4"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <Text fontSize="$4" fontWeight="600" numberOfLines={3} flex={1} color="$color11">
          {note.text.trim() || 'Empty note'}
        </Text>
        <Text fontSize="$2" color="$color9" flexShrink={0}>
          {note.deletedAt ? compactDate(note.deletedAt) : ''}
        </Text>
      </XStack>
      <Button size="$2" marginTop="$2" alignSelf="flex-start" onPress={() => onRestore(note.id)}>
        Restore
      </Button>
    </YStack>
  );
}

export default function NotesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const repo = useNotesStore((s) => s.repo);
  const allNotes = useNotesStore((s) => s.allNotes);
  const favourites = useNotesStore((s) => s.favourites);
  const archived = useNotesStore((s) => s.archived);
  const trash = useNotesStore((s) => s.trash);
  const trashUndo = useNotesStore((s) => s.trashUndo);
  const setTrashUndo = useNotesStore((s) => s.setTrashUndo);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [category, setCategory] = useState<Category>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const handleImport = useCallback(async () => {
    if (!repo) return;
    try {
      const notes = await pickAndImportNotes();
      if (notes.length === 0) return;
      await repo.importNotes(notes);
      Alert.alert('Import complete', `${notes.length} note${notes.length === 1 ? '' : 's'} merged.`);
    } catch (e) {
      Alert.alert('Import failed', (e as Error).message);
    }
  }, [repo]);

  const handleExport = useCallback(async () => {
    if (!repo) return;
    try {
      const notes = await repo.exportNotes();
      await exportNotes(notes);
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    }
  }, [repo]);

  const handleEmptyTrash = useCallback(() => {
    Alert.alert(
      'Empty Trash',
      `Permanently delete ${trash.length} note${trash.length === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setEmptyingTrash(true);
            try { await repo?.emptyTrash(); } finally { setEmptyingTrash(false); }
          },
        },
      ],
    );
  }, [repo, trash.length]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <XStack alignItems="center" gap="$1" paddingRight="$2">
          <Pressable
            onPress={() => { setCategory('all'); setSearchVisible(true); }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
          >
            <Search size={22} color={theme.color12.val} />
          </Pressable>
          <Pressable
            onPress={() => setCategory('favourites')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
          >
            <Star
              size={22}
              color={theme.color12.val}
              fill={category === 'favourites' ? theme.color12.val : 'transparent'}
            />
          </Pressable>
          <OverflowMenu
            items={[
              { label: 'Empty Trash', icon: Trash2, onPress: handleEmptyTrash },
              { label: 'Import', icon: Upload, onPress: handleImport },
              { label: 'Export', icon: Download, onPress: handleExport },
            ]}
          />
        </XStack>
      ),
    });
  }, [navigation, theme, category, handleEmptyTrash, handleImport, handleExport]);

  useEffect(() => {
    if (!trashUndo) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTrashUndo(null), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [trashUndo, setTrashUndo]);

  // Hide search bar when switching away from All Notes
  useEffect(() => {
    if (category !== 'all') {
      setSearchVisible(false);
      setSearchQuery('');
    }
  }, [category]);

  const notes = useMemo(() => {
    if (category === 'all') return allNotes;
    if (category === 'favourites') return favourites;
    if (category === 'archived') return archived;
    return trash;
  }, [category, allNotes, favourites, archived, trash]);

  const displayedNotes = useMemo(() => {
    if (category !== 'all' || !searchQuery.trim()) return notes;
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => n.text.toLowerCase().includes(q));
  }, [notes, category, searchQuery]);

  function handleCreate() {
    router.push('/note/new');
  }

  async function handleUndo() {
    if (!repo || !trashUndo) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    await repo.restoreNote(trashUndo.id);
    setTrashUndo(null);
  }

  async function handleRestore(id: string) {
    await repo?.restoreNote(id);
  }

  function closeSearch() {
    setSearchVisible(false);
    setSearchQuery('');
  }

  const renderNote = useCallback(({ item }: { item: Note }) => <NoteCard note={item} />, []);
  const renderTrash = useCallback(({ item }: { item: Note }) => (
    <TrashCard note={item} onRestore={handleRestore} />
  ), [repo]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <YStack flex={1}>
        {/* Category chips */}
        <XStack paddingHorizontal="$3" paddingTop="$2" paddingBottom="$1" gap="$2">
          {CATEGORIES.map(({ key, label }) => {
            const active = category === key;
            return (
              <Pressable key={key} onPress={() => setCategory(key)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <YStack
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  borderRadius="$10"
                  backgroundColor={active ? '$color12' : '$color3'}
                >
                  <Text fontSize="$3" fontWeight="600" color={active ? '$color1' : '$color11'}>
                    {label}
                  </Text>
                </YStack>
              </Pressable>
            );
          })}
        </XStack>

        {/* Search bar (All Notes only) */}
        {searchVisible && category === 'all' ? (
          <XStack
            marginHorizontal="$4"
            marginTop="$2"
            marginBottom="$1"
            paddingHorizontal="$3"
            paddingVertical="$2"
            backgroundColor="$color3"
            borderRadius="$4"
            alignItems="center"
            gap="$2"
          >
            <Search size={16} color={theme.color9.val} />
            <TextInput
              style={[styles.searchInput, { color: theme.color12.val }]}
              placeholder="Search notes…"
              placeholderTextColor={theme.color9.val}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            <Pressable onPress={closeSearch} hitSlop={8}>
              <X size={18} color={theme.color9.val} />
            </Pressable>
          </XStack>
        ) : null}

        {/* Trash count + empty button */}
        {category === 'trash' && trash.length > 0 ? (
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$3" color="$color10">
              {trash.length} note{trash.length === 1 ? '' : 's'} in trash
            </Text>
            <Button size="$3" onPress={handleEmptyTrash} disabled={emptyingTrash}>
              {emptyingTrash ? 'Deleting…' : 'Empty Trash'}
            </Button>
          </XStack>
        ) : null}

        {/* Notes list */}
        {displayedNotes.length === 0 ? (
          searchQuery.trim() ? (
            <EmptyState label="No Results" />
          ) : (
            <EmptyState label={EMPTY_LABELS[category]} />
          )
        ) : (
          <FlashList
            data={displayedNotes}
            renderItem={category === 'trash' ? renderTrash : renderNote}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(item) => item.id}
          />
        )}

        {/* Undo toast */}
        {trashUndo ? (
          <XStack
            backgroundColor="$color3"
            padding="$3"
            marginHorizontal="$4"
            marginBottom="$2"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$color4"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$3" color="$color12" flex={1} numberOfLines={1}>
              "{trashUndo.label}" moved to trash
            </Text>
            <Button size="$2" onPress={handleUndo} marginLeft="$2">
              Undo
            </Button>
          </XStack>
        ) : null}

        {/* FAB (not shown in trash) */}
        {category !== 'trash' && !searchVisible ? (
          <Pressable onPress={handleCreate} style={styles.fabPressable}>
            <YStack
              width={56}
              height={56}
              borderRadius={28}
              backgroundColor="$color2"
              borderWidth={1}
              borderColor="$color4"
              justifyContent="center"
              alignItems="center"
              elevation={6}
            >
              <Text fontSize={30} fontWeight="300" color="$color12" lineHeight={32}>
                +
              </Text>
            </YStack>
          </Pressable>
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  separator: { height: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  fabPressable: { position: 'absolute', bottom: 24, right: 24 },
});
