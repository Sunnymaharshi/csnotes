import { useAlertStore } from '../store/alertStore';
import type { AlertButton } from '../store/alertStore';

export type { AlertButton };

/** Themed drop-in for RN's Alert.alert — same call shape, matches app UI instead of native OS dialogs. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  useAlertStore.getState().show(title, message, buttons);
}
