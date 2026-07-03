import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { LinkSegment } from './linkify';
import {
  useLinkSheetStore,
  type LinkSheetAction,
  type LinkAnchor,
} from '../store/linkSheetStore';
import { showToast } from './toast';

async function openHref(href: string) {
  try {
    await Linking.openURL(href);
  } catch {
    showToast("Can't open link");
  }
}

async function copy(value: string, label: string) {
  try {
    await Clipboard.setStringAsync(value);
    showToast(`${label} copied`);
  } catch {
    showToast("Couldn't copy");
  }
}

/**
 * Open the compact action menu anchored at the tapped link. Options are tailored
 * to the link kind (browser / mail / dialer + SMS), plus Copy and — when the
 * surface supports it — Edit (drops the note into edit mode at the link).
 */
export function showLinkOptions(
  segment: LinkSegment,
  anchor: LinkAnchor,
  opts?: { onEdit?: () => void },
) {
  const { text, href, kind } = segment;
  const actions: LinkSheetAction[] = [];

  if (kind === 'url') {
    actions.push({ label: 'Open', onPress: () => openHref(href) });
    actions.push({ label: 'Copy', onPress: () => copy(text, 'Link') });
  } else if (kind === 'email') {
    actions.push({ label: 'Email', onPress: () => openHref(href) });
    actions.push({ label: 'Copy', onPress: () => copy(text, 'Address') });
  } else {
    // phone — the raw digits from `href` (tel:) are what dial/text should use.
    const number = href.replace(/^tel:/, '');
    actions.push({ label: 'Call', onPress: () => openHref(href) });
    actions.push({ label: 'Message', onPress: () => openHref(`sms:${number}`) });
    actions.push({ label: 'Copy', onPress: () => copy(text, 'Number') });
  }

  if (opts?.onEdit) {
    actions.push({ label: 'Edit', onPress: opts.onEdit });
  }

  useLinkSheetStore.getState().show(anchor, actions);
}
