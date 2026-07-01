import { YStack, Text, Button } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllNotesScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$4">
        <Text fontSize="$8" fontWeight="bold">CS Notes</Text>
        <Text color="$color10">Phase 1 scaffold — app is running.</Text>
        <Button>Create Note</Button>
      </YStack>
    </SafeAreaView>
  );
}
