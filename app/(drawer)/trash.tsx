import { useCallback, useLayoutEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack } from 'tamagui';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from 'expo-router';
import { useNotesStore } from '../../src/store/notesStore';
import { useLayoutStore } from '../../src/store/layoutStore';
import { useBottomNavStore } from '../../src/store/bottomNavStore';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { OverflowMenu } from '../../src/components/OverflowMenu';
import { HeaderStar } from '../../src/components/HeaderStar';
import { BottomBar } from '../../src/components/BottomBar';
import { BottomSelectionBar } from '../../src/components/BottomSelectionBar';
import { SelectionHeaderLeft, SelectionHeaderRight } from '../../src/components/SelectionHeader';
import { useSelectionMode } from '../../src/hooks/useSelectionMode';
import { useSearchBar } from '../../src/hooks/useSearchBar';
import { useDrawerCloseGuard } from '../../src/hooks/useDrawerCloseGuard';
import { useGlobalOverflowItems } from '../../src/hooks/useGlobalOverflowItems';
import {
  bulkFavourite,
  bulkShare,
  buildSelectionOverflowItems,
  buildSelectionDeleteItem,
} from '../../src/lib/bulkNoteActions';
import type { Note } from '../../src/types/Note';

export default function TrashScreen() {
  const navigation = useNavigation();
  const repo = useNotesStore((s) => s.repo);
  const trash = useNotesStore((s) => s.trash);

  const layout = useLayoutStore((s) => s.layout);
  const bottomNav = useBottomNavStore((s) => s.enabled);
  const selection = useSelectionMode();
  const search = useSearchBar(trash);
  const contentLocked = useDrawerCloseGuard();
  const globalOverflowItems = useGlobalOverflowItems(repo, 'trash', trash.length, search.open, !bottomNav);

  // Hardware back: exit selection, then close search, before default behavior.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selection.isSelecting) {
          selection.exit();
          return true;
        }
        if (search.visible) {
          search.close();
          return true;
        }
        return false;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selection.isSelecting, search.visible]),
  );

  useLayoutEffect(() => {
    if (selection.isSelecting && !bottomNav) {
      const selectedNotes = trash.filter((n) => selection.selectedIds.has(n.id));
      navigation.setOptions({
        headerLeft: () => (
          <SelectionHeaderLeft count={selectedNotes.length} onBack={selection.exit} />
        ),
        headerRight: () => (
          <SelectionHeaderRight
            onFavourite={() => bulkFavourite(repo!, selectedNotes).then(selection.exit)}
            onShare={() => bulkShare(selectedNotes)}
            deleteItem={repo ? buildSelectionDeleteItem(repo, selectedNotes, selection.exit, true) : undefined}
            overflowItems={repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit) : []}
          />
        ),
      });
    } else {
      if (!selection.isSelecting) search.close();
      navigation.setOptions({
        headerLeft: bottomNav ? () => null : undefined,
        headerRight: bottomNav
          ? undefined
          : () => <HeaderStar overflow={<OverflowMenu items={globalOverflowItems} />} />,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, selection.isSelecting, selection.selectedIds, repo, trash, globalOverflowItems, bottomNav]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => {
      const card = (
        <NoteCard
          note={item}
          layout={layout}
          date={item.deletedAt ?? undefined}
          selectionMode={selection.isSelecting}
          selected={selection.selectedIds.has(item.id)}
          onLongPress={() => selection.enter(item.id)}
          onToggleSelect={() => selection.toggle(item.id)}
        />
      );
      return layout === 'grid' ? <View style={styles.gridCell}>{card}</View> : card;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection.isSelecting, selection.selectedIds, layout],
  );

  const insets = useSafeAreaInsets();
  const selecting = selection.isSelecting;
  const showBottomBar = bottomNav && !selecting;
  const barPad = bottomNav ? { paddingBottom: insets.bottom + 76 } : null;
  const listContentStyle = layout === 'grid'
    ? [styles.gridList, barPad]
    : [styles.list, barPad];
  const selectedNotes = selecting ? trash.filter((n) => selection.selectedIds.has(n.id)) : [];

  return (
    <SafeAreaView style={styles.safe} edges={bottomNav ? [] : ['bottom']}>
      <YStack flex={1} pointerEvents={contentLocked ? 'none' : 'auto'}>
        {search.visible ? (
          <SearchBar value={search.query} onChangeText={search.setQuery} onClose={search.close} />
        ) : null}

        {search.displayedNotes.length === 0 ? (
          <EmptyState label={search.query.trim() ? 'No Results' : 'Trash is Empty'} />
        ) : (
          <FlashList
            key={layout}
            data={search.displayedNotes}
            renderItem={renderItem}
            numColumns={layout === 'grid' ? 2 : 1}
            masonry={layout === 'grid'}
            contentContainerStyle={listContentStyle}
            ItemSeparatorComponent={layout === 'grid' ? undefined : () => <View style={styles.separator} />}
            keyExtractor={(item) => item.id}
          />
        )}

        {showBottomBar ? <BottomBar actionItems={globalOverflowItems} onSearch={search.open} /> : null}

        {bottomNav && selecting ? (
          <BottomSelectionBar
            count={selectedNotes.length}
            onBack={selection.exit}
            onFavourite={() => bulkFavourite(repo!, selectedNotes).then(selection.exit)}
            onShare={() => bulkShare(selectedNotes)}
            deleteItem={repo ? buildSelectionDeleteItem(repo, selectedNotes, selection.exit, true) : undefined}
            overflowItems={repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit) : []}
          />
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16 },
  gridList: { paddingHorizontal: 10, paddingTop: 12 },
  gridCell: { paddingHorizontal: 6, paddingBottom: 12 },
  separator: { height: 8 },
});
