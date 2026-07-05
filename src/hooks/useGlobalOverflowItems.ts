import { useMemo } from 'react';
import { Search, Trash2, ArchiveRestore, ArrowUpDown } from 'lucide-react-native';
import type { NotesRepository } from '../data/NotesRepository';
import { useSortStore } from '../store/sortStore';
import { confirmEmptyTrash, confirmRestoreAllTrash } from '../lib/globalOverflowActions';
import type { OverflowItem } from '../components/OverflowMenu';

/** Which list view the overflow menu is being built for. */
export type OverflowView = 'all' | 'favourites' | 'archived' | 'trash';

/**
 * Contextual header overflow items. Search + Sort show on every view; Trash-only
 * bulk actions (Restore / Clear) show only in Trash. Rare/dangerous ops
 * (Import / Export / Delete Everything) live in Settings, not here.
 */
export function useGlobalOverflowItems(
  repo: NotesRepository | null,
  view: OverflowView,
  trashCount: number,
  openSearch: () => void,
  // Bottom-nav mode gives Search its own bar button, so the sheet omits it.
  includeSearch = true,
): OverflowItem[] {
  const openSortMenu = useSortStore((s) => s.openMenu);

  return useMemo<OverflowItem[]>(() => {
    if (!repo) return [];
    const items: OverflowItem[] = [];
    if (includeSearch) items.push({ label: 'Search', icon: Search, onPress: openSearch });
    items.push({ label: 'Sort', icon: ArrowUpDown, onPress: openSortMenu });
    if (view === 'trash') {
      items.push(
        { label: 'Restore from Trash', icon: ArchiveRestore, onPress: () => confirmRestoreAllTrash(repo, trashCount) },
        { label: 'Clear Trash', icon: Trash2, onPress: () => confirmEmptyTrash(repo, trashCount) },
      );
    }
    return items;
  }, [repo, view, trashCount, openSearch, openSortMenu, includeSearch]);
}
