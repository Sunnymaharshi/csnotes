import { useCallback, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, XStack, Text, Button } from 'tamagui';
import { PressableScale } from '../../src/components/PressableScale';
import { longPressFeedback, tapFeedback } from '../../src/lib/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { useNotesStore } from '../../src/store/notesStore';
import { compactDate } from '../../src/lib/compactDate';
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
import { confirmEmptyTrash } from '../../src/lib/globalOverflowActions';
import type { Note } from '../../src/types/Note';

function TrashCard({
  note,
  onOpen,
  selectionMode,
  selected,
  onLongPress,
  onToggleSelect,
}: {
  note: Note;
  onOpen: (id: string) => void;
  selectionMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <PressableScale
      onLongPress={() => {
        longPressFeedback();
        onLongPress();
      }}
      onPress={() => {
        if (selectionMode) {
          tapFeedback();
          onToggleSelect();
        } else {
          onOpen(note.id);
        }
      }}
    >
      <YStack
        backgroundColor={selected ? '$color3' : '$color2'}
        borderRadius="$4"
        padding="$3"
        gap="$1"
        borderWidth={selected ? 2 : 1}
        borderColor={selected ? '$color8' : '$color4'}
      >
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
          <Text fontSize="$4" fontWeight="600" numberOfLines={3} flex={1} color="$color11">
            {note.text.trim() || 'Empty note'}
          </Text>
          <Text fontSize="$2" color="$color9" flexShrink={0}>
            {note.deletedAt ? compactDate(note.deletedAt) : ''}
          </Text>
        </XStack>
      </YStack>
    </PressableScale>
  );
}

export default function TrashScreen() {
  const navigation = useNavigation();
  const router = useRouter();
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
      <TrashCard
        note={item}
        onOpen={(id) => router.push(`/note/${id}`)}
        selectionMode={selection.isSelecting}
        selected={selection.selectedIds.has(item.id)}
        onLongPress={() => selection.enter(item.id)}
        onToggleSelect={() => selection.toggle(item.id)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, selection.isSelecting, selection.selectedIds],
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
            {!selection.isSelecting ? (
              <XStack
                paddingHorizontal="$4"
                paddingVertical="$3"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize="$3" color="$color10">
                  {trash.length} note{trash.length === 1 ? '' : 's'} in trash
                </Text>
                <Button size="$3" onPress={() => confirmEmptyTrash(repo!, trash.length)}>
                  Empty Trash
                </Button>
              </XStack>
            ) : null}
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
