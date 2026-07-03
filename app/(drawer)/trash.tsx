import { useCallback, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useNotesStore } from '../../src/store/notesStore';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { OverflowMenu } from '../../src/components/OverflowMenu';
import { HeaderStar } from '../../src/components/HeaderStar';
import { SelectionHeaderLeft, SelectionHeaderRight } from '../../src/components/SelectionHeader';
import { useSelectionMode } from '../../src/hooks/useSelectionMode';
import { useSearchBar } from '../../src/hooks/useSearchBar';
import { useDrawerCloseGuard } from '../../src/hooks/useDrawerCloseGuard';
import { useGlobalOverflowItems } from '../../src/hooks/useGlobalOverflowItems';
import { bulkFavourite, bulkShare, buildSelectionOverflowItems } from '../../src/lib/bulkNoteActions';
import type { Note } from '../../src/types/Note';

export default function TrashScreen() {
  const navigation = useNavigation();
  const repo = useNotesStore((s) => s.repo);
  const trash = useNotesStore((s) => s.trash);
  // allNotes/archived are only needed for the total count here — subscribe to the
  // number, not the arrays, so unrelated edits don't re-render the Trash screen.
  const totalCount = useNotesStore((s) => s.allNotes.length + s.archived.length + s.trash.length);

  const selection = useSelectionMode();
  const search = useSearchBar(trash);
  const contentLocked = useDrawerCloseGuard();
  const globalOverflowItems = useGlobalOverflowItems(repo, trash.length, search.open, totalCount);

  useLayoutEffect(() => {
    if (selection.isSelecting) {
      const selectedNotes = trash.filter((n) => selection.selectedIds.has(n.id));
      navigation.setOptions({
        headerLeft: () => (
          <SelectionHeaderLeft count={selectedNotes.length} onBack={selection.exit} />
        ),
        headerRight: () => (
          <SelectionHeaderRight
            onFavourite={() => bulkFavourite(repo!, selectedNotes).then(selection.exit)}
            onShare={() => bulkShare(selectedNotes)}
            overflowItems={
              repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit, true) : []
            }
          />
        ),
      });
    } else {
      search.close();
      navigation.setOptions({
        headerLeft: undefined,
        headerRight: () => <HeaderStar overflow={<OverflowMenu items={globalOverflowItems} />} />,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, selection.isSelecting, selection.selectedIds, repo, trash, globalOverflowItems]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        date={item.deletedAt ?? undefined}
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
          <EmptyState label={search.query.trim() ? 'No Results' : 'Trash is Empty'} />
        ) : (
          <>
            <FlashList
              data={search.displayedNotes}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyExtractor={(item) => item.id}
            />
          </>
        )}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16 },
  separator: { height: 8 },
});
