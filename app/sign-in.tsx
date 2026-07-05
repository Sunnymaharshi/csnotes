import { useState } from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../src/components/PressableScale';
import { useRouter } from 'expo-router';
import { signInWithGoogle } from '../src/lib/googleAuth';
import { useAuthStore } from '../src/store/authStore';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setGuest = useAuthStore((s) => s.setGuest);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[sign-in]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueOffline() {
    await setGuest(true);
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$8">
        <YStack alignItems="center" gap="$2">
          <Text fontSize="$10" fontWeight="bold">CS Notes</Text>
          <Text fontSize="$4" color="$color10">Your private notebook</Text>
        </YStack>

        <YStack width="100%" maxWidth={320} gap="$3">
          <PressableScale onPress={handleSignIn} disabled={loading} scaleTo={0.97}>
            <XStack
              height={52}
              alignItems="center"
              justifyContent="center"
              gap="$2"
              borderRadius="$4"
              backgroundColor="$color12"
              opacity={loading ? 0.5 : 1}
            >
              {loading ? <Spinner color="$color1" /> : null}
              <Text fontSize="$5" fontWeight="600" color="$color1">
                {loading ? 'Signing in…' : 'Sign in with Google'}
              </Text>
            </XStack>
          </PressableScale>
          {error ? (
            <Text color="$red10" textAlign="center" fontSize="$3">
              {error}
            </Text>
          ) : null}

          <PressableScale onPress={handleContinueOffline} disabled={loading} scaleTo={0.97}>
            <XStack height={52} alignItems="center" justifyContent="center" opacity={loading ? 0.5 : 1}>
              <Text fontSize="$5" fontWeight="600" color="$color11">
                Continue without signing in
              </Text>
            </XStack>
          </PressableScale>
          <Text color="$color9" textAlign="center" fontSize="$2">
            Use the app offline. You can sign in later to sync.
          </Text>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
