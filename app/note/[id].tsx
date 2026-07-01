import { useLocalSearchParams } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text color="$color10">Editor for note {id} — coming in Phase 4.</Text>
      </YStack>
    </SafeAreaView>
  );
}
