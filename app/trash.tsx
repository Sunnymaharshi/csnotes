import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TrashScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text color="$color10">Trash — coming in Phase 6.</Text>
      </YStack>
    </SafeAreaView>
  );
}
