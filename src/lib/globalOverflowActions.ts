import type { NotesRepository } from '../data/NotesRepository';
import { showToast, noteCount } from './toast';
import { showAlert } from './alert';
import { successFeedback, warningFeedback } from './haptics';

export function confirmEmptyTrash(repo: NotesRepository, trashCount: number) {
  if (trashCount === 0) {
    showToast('Trash is already empty');
    return;
  }
  showAlert(
    'Empty Trash',
    `Permanently delete ${noteCount(trashCount)}? This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          await repo.emptyTrash();
          warningFeedback();
          showToast('Trash emptied');
        },
      },
    ],
  );
}

export function confirmRestoreAllTrash(repo: NotesRepository, trashCount: number) {
  if (trashCount === 0) {
    showToast('Trash is empty');
    return;
  }
  showAlert(
    'Restore from Trash',
    `Restore ${noteCount(trashCount)} from trash?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          await repo.restoreAllTrash();
          successFeedback();
          showToast(`${noteCount(trashCount)} restored`);
        },
      },
    ],
  );
}

export function confirmDeleteNoteForever(onConfirm: () => void) {
  showAlert(
    'Delete Forever',
    'Permanently delete this note? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function confirmDeleteForever(count: number, onConfirm: () => void) {
  showAlert(
    'Delete Forever',
    `Permanently delete ${count} note${count === 1 ? '' : 's'}? This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function confirmDeleteEverything(repo: NotesRepository, totalCount: number) {
  if (totalCount === 0) {
    showToast('There are no notes to delete');
    return;
  }
  showAlert(
    'Delete Everything',
    'Permanently delete ALL notes, including favourites, archived, and trash? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: async () => {
          await repo.deleteEverything();
          warningFeedback();
          showToast('All notes deleted');
        },
      },
    ],
  );
}
