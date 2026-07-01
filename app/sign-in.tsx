import { useState } from 'react';
import { YStack, Text, Button, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogle } from '../src/lib/googleAuth';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$8">
        <YStack alignItems="center" gap="$2">
          <Text fontSize="$10" fontWeight="bold">CS Notes</Text>
          <Text fontSize="$4" color="$color10">Your private notebook</Text>
        </YStack>

        <YStack width="100%" maxWidth={320} gap="$3">
          <Button
            size="$5"
            onPress={handleSignIn}
            disabled={loading}
            icon={loading ? <Spinner /> : undefined}
          >
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </Button>
          {error ? (
            <Text color="$red10" textAlign="center" fontSize="$3">
              {error}
            </Text>
          ) : null}
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
