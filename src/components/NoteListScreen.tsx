import { useCallback, useLayoutEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { useNotesStore } from '../store/notesStore';
import { NoteCard } from './NoteCard';
import { EmptyState } from './EmptyState';
import { SearchBar } from './SearchBar';
import { OverflowMenu } from './OverflowMenu';
import { SelectionHeaderLeft, SelectionHeaderRight } from './SelectionHeader';
import { useSelectionMode } from '../hooks/useSelectionMode';
import { useSearchBar } from '../hooks/useSearchBar';
import { useGlobalOverflowItems } from '../hooks/useGlobalOverflowItems';
import { useDrawerCloseGuard } from '../hooks/useDrawerCloseGuard';
import { bulkFavourite, bulkShare, buildSelectionOverflowItems } from '../lib/bulkNoteActions';
import { HeaderStar } from './HeaderStar';
import type { Note } from '../types/Note';

export function NoteListScreen({
  notes,
  emptyLabel,
  showFab = false,
}: {
  notes: Note[];
  emptyLabel: string;
  showFab?: boolean;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const repo = useNotesStore((s) => s.repo);
  const trash = useNotesStore((s) => s.trash);
  const allNotes = useNotesStore((s) => s.allNotes);
  const archived = useNotesStore((s) => s.archived);

  const selection = useSelectionMode();
  const search = useSearchBar(notes);
  const totalCount = allNotes.length + archived.length + trash.length;
  const globalOverflowItems = useGlobalOverflowItems(repo, trash.length, search.open, totalCount);
  const contentLocked = useDrawerCloseGuard();

  useLayoutEffect(() => {
    if (selection.isSelecting) {
      const selectedNotes = notes.filter((n) => selection.selectedIds.has(n.id));
      navigation.setOptions({
        headerLeft: () => (
          <SelectionHeaderLeft count={selectedNotes.length} onBack={selection.exit} />
        ),
        headerRight: () => (
          <SelectionHeaderRight
            onFavourite={() => bulkFavourite(repo!, selectedNotes).then(selection.exit)}
            onShare={() => bulkShare(selectedNotes)}
            overflowItems={repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit) : []}
          />
        ),
      });
    } else {
      search.close();
      navigation.setOptions({
        headerLeft: undefined,
        headerRight: () => (
          <HeaderStar overflow={<OverflowMenu items={globalOverflowItems} />} />
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, selection.isSelecting, selection.selectedIds, repo, notes, globalOverflowItems]);

  function handleCreate() {
    router.push('/note/new');
  }

  const renderNote = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        selectionMode={selection.isSelecting}
        selected={selection.selectedIds.has(item.id)}
        onLongPress={() => selection.enter(item.id)}
        onToggleSelect={() => selection.toggle(item.id)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection.isSelecting, selection.selectedIds],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <YStack flex={1} pointerEvents={contentLocked ? 'none' : 'auto'}>
        {search.visible ? (
          <SearchBar value={search.query} onChangeText={search.setQuery} onClose={search.close} />
        ) : null}

        {search.displayedNotes.length === 0 ? (
          <EmptyState label={search.query.trim() ? 'No Results' : emptyLabel} />
        ) : (
          <FlashList
            data={search.displayedNotes}
            renderItem={renderNote}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(item) => item.id}
          />
        )}

        {showFab && !search.visible && !selection.isSelecting ? (
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
  fabPressable: { position: 'absolute', bottom: 24, right: 24 },
});
