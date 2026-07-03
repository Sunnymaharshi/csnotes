// Pure, render-layer detection of URLs, emails, and phone numbers in raw note
// text. No schema change — both the NoteCard preview and the editor's read
// state share this so the two surfaces linkify identically. Returns the note
// split into plain-text and link segments; the caller decides how to render.

export type LinkKind = 'url' | 'email' | 'phone';

export interface LinkSegment {
  type: 'link';
  kind: LinkKind;
  /** The exact text as it appears in the note (used as the visible label). */
  text: string;
  /** The URI to hand to `Linking.openURL` (https:/mailto:/tel:). */
  href: string;
}

export interface TextSegment {
  type: 'text';
  text: string;
}

export type Segment = TextSegment | LinkSegment;

// One pass, priority email > url > phone so an address like `a@b.com` is never
// mis-split by the url branch (which requires a scheme or `www.`). Phone is last
// and deliberately conservative to limit false positives on long digit runs.
// Numbered (not named) groups: Hermes doesn't support named capture groups, so
// `match.groups` is undefined on device — group 1=email, 2=url, 3=phone.
const LINK_RE =
  /([^\s@<>()]+@[^\s@<>()]+\.[^\s@<>().,;:!?]+)|((?:https?:\/\/|www\.)[^\s<>()]+)|(\+?\d[\d\s().-]{6,}\d)/gi;

// Trailing punctuation is almost always sentence punctuation, not part of the
// link — pull it back into the following text segment.
const TRAILING_PUNCT = /[.,;:!?)\]'"]+$/;

function hrefFor(kind: LinkKind, value: string): string {
  switch (kind) {
    case 'email':
      return `mailto:${value}`;
    case 'phone':
      return `tel:${value.replace(/[^\d+]/g, '')}`;
    case 'url':
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }
}

/**
 * Split `text` into ordered plain and link segments. Concatenating every
 * segment's `text` reproduces the input exactly, so this is safe for rendering
 * without losing or reordering characters.
 */
export function linkify(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_RE)) {
    const kind: LinkKind = match[1] ? 'email' : match[2] ? 'url' : 'phone';
    let value = match[0];
    const start = match.index!;

    // Peel trailing punctuation off links (not emails — dots are structural
    // there and already excluded by the email pattern's final char class).
    let trailing = '';
    if (kind !== 'email') {
      const m = value.match(TRAILING_PUNCT);
      if (m) {
        trailing = m[0];
        value = value.slice(0, value.length - trailing.length);
      }
    }

    // A phone match that has no digit separators and is short is more likely a
    // stray number (e.g. a year range); require some structure or length.
    if (kind === 'phone' && value.replace(/[^\d]/g, '').length < 7) {
      continue;
    }

    if (start > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, start) });
    }
    segments.push({ type: 'link', kind, text: value, href: hrefFor(kind, value) });
    if (trailing) {
      segments.push({ type: 'text', text: trailing });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}

/** True when the text contains at least one detectable link. */
export function hasLinks(text: string): boolean {
  LINK_RE.lastIndex = 0;
  return LINK_RE.test(text);
}
