import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Search, Trash2, ArchiveRestore, Upload, Download, XCircle } from 'lucide-react-native';
import type { NotesRepository } from '../data/NotesRepository';
import { exportNotes, pickAndImportNotes } from '../lib/exportImport';
import {
  confirmEmptyTrash,
  confirmRestoreAllTrash,
  confirmDeleteEverything,
} from '../lib/globalOverflowActions';
import type { OverflowItem } from '../components/OverflowMenu';

export function useGlobalOverflowItems(
  repo: NotesRepository | null,
  trashCount: number,
  openSearch: () => void,
  totalCount: number,
): OverflowItem[] {
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

  return useMemo<OverflowItem[]>(() => {
    if (!repo) return [];
    return [
      { label: 'Search', icon: Search, onPress: openSearch },
      { label: 'Clear Trash', icon: Trash2, onPress: () => confirmEmptyTrash(repo, trashCount) },
      { label: 'Restore from Trash', icon: ArchiveRestore, onPress: () => confirmRestoreAllTrash(repo, trashCount) },
      { label: 'Import Database', icon: Upload, onPress: handleImport },
      { label: 'Export Database', icon: Download, onPress: handleExport },
      { label: 'Delete Everything', icon: XCircle, onPress: () => confirmDeleteEverything(repo, totalCount) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, trashCount, openSearch, totalCount, handleImport, handleExport]);
}
