import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ArchivedScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text color="$color10">Archived — coming in Phase 5.</Text>
      </YStack>
    </SafeAreaView>
  );
}
