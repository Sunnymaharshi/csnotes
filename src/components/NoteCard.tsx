import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import type { Note } from '../types/Note';
import { compactDate } from '../lib/compactDate';

export function NoteCard({ note }: { note: Note }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/note/${note.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <YStack
        backgroundColor="$color2"
        borderRadius="$4"
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$2"
        borderWidth={1}
        borderColor="$color4"
      >
        <Text fontSize="$5" fontWeight="700" color="$color12" numberOfLines={8}>
          {note.text.trim() || 'Empty note'}
        </Text>
        <XStack justifyContent="flex-end">
          <Text fontSize="$2" color="$color9">
            {compactDate(note.updatedAt)}
          </Text>
        </XStack>
      </YStack>
    </Pressable>
  );
}
