import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text color="$color10">Settings (export/import, sign-out) — coming in Phase 10.</Text>
      </YStack>
    </SafeAreaView>
  );
}
