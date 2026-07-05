import { useCallback, useLayoutEffect, useMemo } from 'react';
import { BackHandler, StyleSheet, View, useColorScheme } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, useTheme } from 'tamagui';
import { Plus } from 'lucide-react-native';
import { PressableScale } from './PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { useDrawerStatus } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '../store/notesStore';
import { useThemeStore } from '../store/themeStore';
import { useSortStore } from '../store/sortStore';
import { useLayoutStore } from '../store/layoutStore';
import { useBottomNavStore } from '../store/bottomNavStore';
import { NoteCard } from './NoteCard';
import { EmptyState } from './EmptyState';
import { SearchBar } from './SearchBar';
import { OverflowMenu } from './OverflowMenu';
import { SelectionHeaderLeft, SelectionHeaderRight } from './SelectionHeader';
import { useSelectionMode } from '../hooks/useSelectionMode';
import { useSearchBar } from '../hooks/useSearchBar';
import { useGlobalOverflowItems, type OverflowView } from '../hooks/useGlobalOverflowItems';
import { useDrawerCloseGuard } from '../hooks/useDrawerCloseGuard';
import {
  bulkFavourite,
  bulkShare,
  buildSelectionOverflowItems,
  buildSelectionDeleteItem,
  buildSelectionPinItem,
} from '../lib/bulkNoteActions';
import { HeaderStar } from './HeaderStar';
import { BottomBar, BOTTOM_BAR_HEIGHT } from './BottomBar';
import { BottomSelectionBar } from './BottomSelectionBar';
import type { Note } from '../types/Note';

export function NoteListScreen({
  notes,
  emptyLabel,
  view,
  showFab = false,
  allowPin = true,
}: {
  notes: Note[];
  emptyLabel: string;
  view: OverflowView;
  showFab?: boolean;
  allowPin?: boolean;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.themeMode);
  const isLight = themeMode === 'system' ? systemScheme !== 'dark' : themeMode === 'light';
  const repo = useNotesStore((s) => s.repo);
  // Count-only selectors: re-render when the counts change, not on every
  // Firestore snapshot that swaps array identity while lengths stay the same.
  const trashCount = useNotesStore((s) => s.trash.length);

  const layout = useLayoutStore((s) => s.layout);
  const bottomNav = useBottomNavStore((s) => s.enabled);
  const sortField = useSortStore((s) => s.field);
  const sortDir = useSortStore((s) => s.dir);
  const sortedNotes = useMemo(() => {
    const key = sortField === 'created' ? 'createdAt' : 'updatedAt';
    const mul = sortDir === 'asc' ? 1 : -1;
    // Pinned notes group above the rest (§8.1); within each group the chosen sort
    // applies. Array.sort is stable, so within-group order matches the plain sort.
    return [...notes].sort(
      (a, b) => Number(!!b.isPinned) - Number(!!a.isPinned) || (a[key] - b[key]) * mul,
    );
  }, [notes, sortField, sortDir]);

  const selection = useSelectionMode();
  const search = useSearchBar(sortedNotes);
  // Bottom-nav gives Search a dedicated bar button, so drop it from the sheet list.
  const globalOverflowItems = useGlobalOverflowItems(repo, view, trashCount, search.open, !bottomNav);
  const contentLocked = useDrawerCloseGuard();
  const drawerStatus = useDrawerStatus();

  // Hardware back: exit selection, close search, then the drawer, before falling
  // through to default behavior (leaving the screen / exiting the app on root).
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
        if (drawerStatus === 'open') {
          // expo-router's drawer router doesn't publicly export DrawerActions,
          // so dispatch the plain action it recognizes internally.
          navigation.dispatch({ type: 'CLOSE_DRAWER' });
          return true;
        }
        return false;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selection.isSelecting, search.visible, drawerStatus, navigation]),
  );

  useLayoutEffect(() => {
    // In bottom-nav mode selection lives in a BottomSelectionBar, so the header
    // stays title-only even while selecting (only the top-nav layout uses the
    // SelectionHeader).
    if (selection.isSelecting && !bottomNav) {
      const selectedNotes = notes.filter((n) => selection.selectedIds.has(n.id));
      navigation.setOptions({
        headerLeft: () => (
          <SelectionHeaderLeft count={selectedNotes.length} onBack={selection.exit} />
        ),
        headerRight: () => (
          <SelectionHeaderRight
            onFavourite={() => bulkFavourite(repo!, selectedNotes).then(selection.exit)}
            onShare={() => bulkShare(selectedNotes)}
            pinItem={repo ? buildSelectionPinItem(repo, selectedNotes, selection.exit, false, allowPin) : null}
            deleteItem={repo ? buildSelectionDeleteItem(repo, selectedNotes, selection.exit, false) : undefined}
            overflowItems={repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit) : []}
          />
        ),
      });
    } else {
      if (!selection.isSelecting) search.close();
      navigation.setOptions({
        // Bottom-nav mode replaces the drawer with the Menu sheet, so hide the
        // hamburger; and moves all actions to the BottomBar, leaving a
        // title-only header (§8.5).
        headerLeft: bottomNav ? () => null : undefined,
        headerRight: bottomNav
          ? undefined
          : () => <HeaderStar overflow={<OverflowMenu items={globalOverflowItems} />} />,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, selection.isSelecting, selection.selectedIds, repo, notes, globalOverflowItems, bottomNav]);

  function handleCreate() {
    router.push('/note/new');
  }

  const renderNote = useCallback(
    ({ item }: { item: Note }) => {
      const card = (
        <NoteCard
          note={item}
          layout={layout}
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

  // In bottom-nav mode the BottomBar owns the bottom safe-area inset, so drop the
  // SafeAreaView bottom edge to avoid double-padding, and clear the bar height
  // (56 + inset) plus breathing room so the last card isn't hidden behind it.
  const insets = useSafeAreaInsets();
  const selecting = selection.isSelecting;
  const showBottomBar = bottomNav && !selecting;
  const barPad = bottomNav ? { paddingBottom: insets.bottom + 76 } : null;
  const listContentStyle = layout === 'grid'
    ? [styles.gridList, barPad]
    : [styles.list, barPad];
  // FAB keeps its usual floating position in both layouts; in bottom-nav it just
  // sits above the bar instead of at the screen edge.
  const fabStyle = bottomNav
    ? [styles.fabPressable, { bottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16 }]
    : styles.fabPressable;
  const selectedNotes = selecting ? notes.filter((n) => selection.selectedIds.has(n.id)) : [];

  return (
    <SafeAreaView style={styles.safe} edges={bottomNav ? [] : ['bottom']}>
      <YStack flex={1} pointerEvents={contentLocked ? 'none' : 'auto'}>
        {search.visible ? (
          <SearchBar value={search.query} onChangeText={search.setQuery} onClose={search.close} />
        ) : null}

        {search.displayedNotes.length === 0 ? (
          <EmptyState label={search.query.trim() ? 'No Results' : emptyLabel} />
        ) : (
          <FlashList
            key={layout}
            data={search.displayedNotes}
            renderItem={renderNote}
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
            pinItem={repo ? buildSelectionPinItem(repo, selectedNotes, selection.exit, false, allowPin) : null}
            deleteItem={repo ? buildSelectionDeleteItem(repo, selectedNotes, selection.exit, false) : undefined}
            overflowItems={repo ? buildSelectionOverflowItems(repo, selectedNotes, selection.exit) : []}
          />
        ) : null}

        {showFab && !search.visible && !selecting ? (
          <PressableScale onPress={handleCreate} scaleTo={0.9} style={fabStyle}>
            <YStack
              width={56}
              height={56}
              borderRadius={28}
              backgroundColor={isLight ? '#fff' : theme.color12.val}
              justifyContent="center"
              alignItems="center"
              elevation={4}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.2}
              shadowRadius={4}
            >
              <Plus size={28} strokeWidth={2} color={isLight ? '#000' : theme.color1.val} />
            </YStack>
          </PressableScale>
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 12, paddingBottom: 100 },
  gridList: { paddingHorizontal: 6, paddingTop: 12, paddingBottom: 100 },
  gridCell: { paddingHorizontal: 6, paddingBottom: 12 },
  separator: { height: 10 },
  fabPressable: { position: 'absolute', bottom: 36, right: 26 },
});
