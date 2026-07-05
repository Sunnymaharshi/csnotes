import { Share } from 'react-native';
import { Trash2, Star, Archive, ArchiveRestore, RotateCcw, Pin, PinOff } from 'lucide-react-native';
import type { Note } from '../types/Note';
import type { NotesRepository } from '../data/NotesRepository';
import type { OverflowItem } from '../components/OverflowMenu';
import { confirmDeleteForever } from './globalOverflowActions';
import { showToast, noteCount } from './toast';
import { warningFeedback } from './haptics';

// Bulk actions confirm with a toast (selection clears, so the on-screen change
// isn't self-explanatory). Destructive ops add a warning haptic; non-destructive
// ones rely on the toast alone to avoid double-signaling. No-ops (0 targets) stay silent.

export async function bulkDelete(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt == null);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.trashNote(n.id)));
  warningFeedback();
  showToast(`${noteCount(targets.length)} moved to trash`);
}

// Used when the selected notes are already in the trash — deleting them again
// should be permanent, not just re-trash a no-op.
export async function bulkDeleteForever(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt != null);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.deleteNote(n.id)));
  warningFeedback();
  showToast(`${noteCount(targets.length)} deleted`);
}

// Favouriting/archiving is the last action the user took, so it always wins:
// it un-trashes the note (if it was trashed) too. Only applied to notes that
// aren't already favourited, so it never touches notes where it wouldn't
// change anything.
export async function bulkFavourite(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => !n.isFavourite);
  if (targets.length === 0) return;
  await Promise.all(
    targets.map((n) => repo.updateNote(n.id, { isFavourite: true, isArchived: false, deletedAt: null })),
  );
  showToast(`${noteCount(targets.length)} favourited`);
}

export async function bulkUnfavourite(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.isFavourite);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.updateNote(n.id, { isFavourite: false })));
  showToast(`${noteCount(targets.length)} unfavourited`);
}

export async function bulkArchive(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => !n.isArchived);
  if (targets.length === 0) return;
  // Archiving removes the note from All Notes, so its pin has nowhere to render (§8.1).
  await Promise.all(
    targets.map((n) =>
      repo.updateNote(n.id, { isArchived: true, isFavourite: false, isPinned: false, deletedAt: null }),
    ),
  );
  showToast(`${noteCount(targets.length)} archived`);
}

// Pin toggle (§8.1): pins everything if any selected note is unpinned; only unpins
// when all are already pinned. setPinned deliberately doesn't bump updatedAt.
export async function bulkPin(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => !n.isPinned);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.setPinned(n.id, true)));
  showToast(`${noteCount(targets.length)} pinned`);
}

export async function bulkUnpin(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.isPinned);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.setPinned(n.id, false)));
  showToast(`${noteCount(targets.length)} unpinned`);
}

export async function bulkUnarchive(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.isArchived);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.updateNote(n.id, { isArchived: false })));
  showToast(`${noteCount(targets.length)} unarchived`);
}

export async function bulkRestore(repo: NotesRepository, notes: Note[]) {
  const targets = notes.filter((n) => n.deletedAt != null);
  if (targets.length === 0) return;
  await Promise.all(targets.map((n) => repo.restoreNote(n.id)));
  showToast(`${noteCount(targets.length)} restored`);
}

export async function bulkShare(notes: Note[]) {
  const message = notes.map((n) => n.text.trim() || 'Empty note').join('\n\n---\n\n');
  await Share.share({ message });
}

const runOn =
  (repo: NotesRepository, notes: Note[], onDone: () => void) =>
  (action: (repo: NotesRepository, notes: Note[]) => Promise<void>) =>
  () => {
    action(repo, notes).then(onDone);
  };

/** Delete action promoted to a dedicated selection-bar icon. On the Trash screen
 *  it deletes forever (with a confirm); elsewhere it moves to Trash. */
export function buildSelectionDeleteItem(
  repo: NotesRepository,
  notes: Note[],
  onDone: () => void,
  isTrashScreen = false,
): OverflowItem {
  const run = runOn(repo, notes, onDone);
  return isTrashScreen
    ? {
        label: 'delete forever',
        icon: Trash2,
        onPress: () => confirmDeleteForever(notes.length, run(bulkDeleteForever)),
      }
    : { label: 'delete', icon: Trash2, onPress: run(bulkDelete) };
}

/** Pin toggle promoted to a dedicated selection-bar icon — "unpin" only when
 *  every selected note is already pinned, otherwise "pin". Pin is an
 *  All-Notes/Favourites concept only, so null in Archived/Trash (§8.1). */
export function buildSelectionPinItem(
  repo: NotesRepository,
  notes: Note[],
  onDone: () => void,
  isTrashScreen = false,
  allowPin = true,
): OverflowItem | null {
  if (!allowPin || isTrashScreen) return null;
  const run = runOn(repo, notes, onDone);
  const allPinned = notes.length > 0 && notes.every((n) => n.isPinned);
  return allPinned
    ? { label: 'unpin', icon: PinOff, onPress: run(bulkUnpin) }
    : { label: 'pin', icon: Pin, onPress: run(bulkPin) };
}

/** The remaining selection actions (Favourite/Pin/Delete/Share are dedicated
 *  bar icons; these live in the overflow "more"). */
export function buildSelectionOverflowItems(
  repo: NotesRepository,
  notes: Note[],
  onDone: () => void,
): OverflowItem[] {
  const run = runOn(repo, notes, onDone);
  return [
    { label: 'unfavorite', icon: Star, onPress: run(bulkUnfavourite) },
    { label: 'archive', icon: Archive, onPress: run(bulkArchive) },
    { label: 'unarchive', icon: ArchiveRestore, onPress: run(bulkUnarchive) },
    { label: 'restore', icon: RotateCcw, onPress: run(bulkRestore) },
  ];
}
