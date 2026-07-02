import { Share } from 'react-native';
import { Trash2, Star, Archive, ArchiveRestore, RotateCcw } from 'lucide-react-native';
import type { Note } from '../types/Note';
import type { NotesRepository } from '../data/NotesRepository';
import type { OverflowItem } from '../components/OverflowMenu';
import { confirmDeleteForever } from './globalOverflowActions';

export async function bulkDelete(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt == null);
  await Promise.all(targets.map((n) => repo.trashNote(n.id)));
}

// Used when the selected notes are already in the trash — deleting them again
// should be permanent, not just re-trash a no-op.
export async function bulkDeleteForever(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt != null);
  await Promise.all(targets.map((n) => repo.deleteNote(n.id)));
}

// Favouriting/archiving is the last action the user took, so it always wins:
// it un-trashes the note (if it was trashed) too. Only applied to notes that
// aren't already favourited, so it never touches notes where it wouldn't
// change anything.
export async function bulkFavourite(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => !n.isFavourite);
  await Promise.all(
    targets.map((n) => repo.updateNote(n.id, { isFavourite: true, isArchived: false, deletedAt: null })),
  );
}

export async function bulkUnfavourite(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.isFavourite);
  await Promise.all(targets.map((n) => repo.updateNote(n.id, { isFavourite: false })));
}

export async function bulkArchive(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => !n.isArchived);
  await Promise.all(
    targets.map((n) => repo.updateNote(n.id, { isArchived: true, isFavourite: false, deletedAt: null })),
  );
}

export async function bulkUnarchive(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.isArchived);
  await Promise.all(targets.map((n) => repo.updateNote(n.id, { isArchived: false })));
}

export async function bulkRestore(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt != null);
  await Promise.all(targets.map((n) => repo.restoreNote(n.id)));
}

export async function bulkShare(notes: Note[]) {
  const message = notes.map((n) => n.text.trim() || 'Empty note').join('\n\n---\n\n');
  await Share.share({ message });
}

/** The overflow menu shown in selection mode — always the same 5 actions, no-ops if inapplicable. */
export function buildSelectionOverflowItems(
  repo: NotesRepository,
  notes: Note[],
  onDone: () => void,
  isTrashScreen = false,
): OverflowItem[] {
  const run = (action: (repo: NotesRepository, notes: Note[]) => Promise<void>) => () => {
    action(repo, notes).then(onDone);
  };
  return [
    isTrashScreen
      ? {
          label: 'delete forever',
          icon: Trash2,
          onPress: () => confirmDeleteForever(notes.length, run(bulkDeleteForever)),
        }
      : { label: 'delete', icon: Trash2, onPress: run(bulkDelete) },
    { label: 'unfavorite', icon: Star, onPress: run(bulkUnfavourite) },
    { label: 'archive', icon: Archive, onPress: run(bulkArchive) },
    { label: 'unarchive', icon: ArchiveRestore, onPress: run(bulkUnarchive) },
    { label: 'restore', icon: RotateCcw, onPress: run(bulkRestore) },
  ];
}
