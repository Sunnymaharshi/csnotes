import { memo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import type { Note } from '../types/Note';
import { compactDate } from '../lib/compactDate';
import { PressableScale } from './PressableScale';
import { longPressFeedback, tapFeedback } from '../lib/haptics';

export const NoteCard = memo(function NoteCard({
  note,
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,
}: {
  note: Note;
  selectionMode?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();

  return (
    <PressableScale
      onPress={() => {
        if (selectionMode) {
          tapFeedback();
          onToggleSelect?.();
        } else {
          router.push(`/note/${note.id}`);
        }
      }}
      onLongPress={() => {
        longPressFeedback();
        onLongPress?.();
      }}
    >
      <YStack
        backgroundColor={selected ? '$color3' : '$color2'}
        borderRadius="$4"
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$2"
        borderWidth={selected ? 2 : 1}
        borderColor={selected ? '$color8' : '$color4'}
      >
        <Text fontSize="$5" fontWeight="700" color="$color12" numberOfLines={8}>
          {note.text.trim() || 'Empty note'}
        </Text>
        <XStack justifyContent="flex-end" alignItems="center">
          <Text fontSize="$2" color="$color9">
            {compactDate(note.updatedAt)}
          </Text>
        </XStack>
      </YStack>
    </PressableScale>
  );
});
