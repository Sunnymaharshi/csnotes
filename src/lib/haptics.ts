import * as Haptics from 'expo-haptics';

// Restrained, notes-app-appropriate haptics. Kept behind one wrapper so intensity
// can be tuned in a single place and call sites read intent, not API detail.
// All calls are fire-and-forget; failures (e.g. unsupported device) are swallowed.

/** Light tick — toggles: select, favourite, archive. */
export function tapFeedback() {
  Haptics.selectionAsync().catch(() => {});
}

/** Medium thump — entering selection mode via long-press (the one "you're in a mode now" moment). */
export function longPressFeedback() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Light impact — primary tap affordances like the FAB. */
export function pressFeedback() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success — a mutation completed (save, bulk action, import). */
export function successFeedback() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning — destructive action committed (trash, delete forever, empty trash). */
export function warningFeedback() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
