import { Alert, ToastAndroid } from 'react-native';
import type { NotesRepository } from '../data/NotesRepository';

export function confirmEmptyTrash(repo: NotesRepository, trashCount: number) {
  if (trashCount === 0) {
    ToastAndroid.show('Trash is already empty', ToastAndroid.SHORT);
    return;
  }
  Alert.alert(
    'Empty Trash',
    `Permanently delete ${trashCount} note${trashCount === 1 ? '' : 's'}? This cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: () => repo.emptyTrash() },
    ],
  );
}

export function confirmRestoreAllTrash(repo: NotesRepository, trashCount: number) {
  if (trashCount === 0) {
    ToastAndroid.show('Trash is empty', ToastAndroid.SHORT);
    return;
  }
  Alert.alert(
    'Restore from Trash',
    `Restore ${trashCount} note${trashCount === 1 ? '' : 's'} from trash?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => repo.restoreAllTrash() },
    ],
  );
}

export function confirmDeleteNoteForever(onConfirm: () => void) {
  Alert.alert(
    'Delete Forever',
    'Permanently delete this note? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function confirmDeleteForever(count: number, onConfirm: () => void) {
  Alert.alert(
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
    ToastAndroid.show('There are no notes to delete', ToastAndroid.SHORT);
    return;
  }
  Alert.alert(
    'Delete Everything',
    'Permanently delete ALL notes, including favourites, archived, and trash? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Everything', style: 'destructive', onPress: () => repo.deleteEverything() },
    ],
  );
}
