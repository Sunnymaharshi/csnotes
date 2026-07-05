import type { NotesRepository } from '../data/NotesRepository';
import { showToast, noteCount } from './toast';
import { showAlert } from './alert';
import { warningFeedback } from './haptics';

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

export function confirmSignOut(onConfirm: () => void) {
  showAlert(
    'Sign out',
    'Sign out of this account? Your notes stay safe in the cloud and sync back when you sign in again.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: onConfirm },
    ],
  );
}

export function confirmDeleteAccount(onConfirm: () => void) {
  showAlert(
    'Delete account',
    'Permanently delete your account and ALL notes (favourites, archived, and trash) from every device? ' +
      'This cannot be undone.\n\nTip: export a backup first if you want to keep a copy.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: onConfirm },
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
