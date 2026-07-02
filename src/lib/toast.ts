import { ToastAndroid } from 'react-native';

/** Single toast entry point so every mutation confirms consistently (Android). */
export function showToast(message: string) {
  ToastAndroid.show(message, ToastAndroid.SHORT);
}

/** Pluralize a note count for confirmation messages, e.g. `noteCount(3)` → "3 notes". */
export function noteCount(n: number) {
  return `${n} note${n === 1 ? '' : 's'}`;
}
