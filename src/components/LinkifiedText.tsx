import { Fragment, useMemo } from 'react';
import { Text } from 'tamagui';
import type { GetProps } from 'tamagui';
import { linkify } from '../lib/linkify';
import { showLinkOptions } from '../lib/linkActions';

type TextProps = GetProps<typeof Text>;

/**
 * Renders raw note text with URLs, emails, and phone numbers as tappable spans
 * (browser / mail / dialer). Detection is centralized in `src/lib/linkify` so
 * NoteCard previews and the editor's read state stay in sync.
 *
 * Link spans handle their own press, so the touch is consumed before it reaches
 * an outer Pressable — a link tap opens the options menu at the tapped point, a
 * tap on plain text falls through to the parent (tap-to-edit).
 *
 * `onEditLinkAt` (when passed) surfaces an "Edit" option in that menu, receiving
 * the character offset just after the tapped link so the editor can drop the
 * caret at the end of the link.
 */
export function LinkifiedText({
  text,
  // Old-app parity: the note view used Android autoLink, whose link color is the
  // theme accent `#00bfff`. This is a deliberate off-ramp from the monochrome
  // token set — links are the one place the old app used hue — so it's hardcoded
  // rather than a `$colorN` token (which are all grayscale).
  linkColor = '#00bfff',
  onEditLinkAt,
  ...textProps
}: {
  text: string;
  linkColor?: string;
  onEditLinkAt?: (offset: number) => void;
} & TextProps) {
  // Plain text renders as Fragments; links render as their own pressable spans
  // (consuming the touch so an outer tap-to-edit doesn't also fire). Segment
  // lengths accumulate so each link knows its absolute end offset, which the
  // link menu's "Edit" uses to place the caret just after the link.
  const children = useMemo(() => {
    let offset = 0;
    return linkify(text).map((seg, i) => {
      const segEnd = offset + seg.text.length;
      offset = segEnd;
      if (seg.type !== 'link') {
        return <Fragment key={i}>{seg.text}</Fragment>;
      }
      const onEdit = onEditLinkAt ? () => onEditLinkAt(segEnd) : undefined;
      return (
        <Text
          key={i}
          color={linkColor}
          textDecorationLine="underline"
          onPress={(e) =>
            showLinkOptions(seg, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }, { onEdit })
          }
          // Enlarge the touch target slightly without shifting layout.
          hitSlop={4}
          suppressHighlighting
        >
          {seg.text}
        </Text>
      );
    });
    // onEditLinkAt only calls stable setters, so its identity churn doesn't need
    // to re-run this; keyed on the inputs that shape the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, linkColor]);

  return <Text {...textProps}>{children}</Text>;
}
