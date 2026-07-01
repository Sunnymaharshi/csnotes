import { useState } from 'react';
import { YStack, Text, Button, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { googleSignOut } from '../src/lib/googleAuth';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await googleSignOut();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$4">
        <Text color="$color10" fontSize="$3">
          Export / import coming in Phase 10.
        </Text>
        <Separator />
        <Button
          size="$4"
          theme="red"
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? 'Signing out…' : 'Sign out'}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
