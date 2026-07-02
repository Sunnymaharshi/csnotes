import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useNotesStore } from '../src/store/notesStore';
import { createFirestoreRepo } from '../src/data/firestoreNotesRepo';
import { useNotesWatcher } from '../src/hooks/useNotesWatcher';
import { useThemeStore } from '../src/store/themeStore';
import tamaguiConfig, { screenBackground } from '../tamagui.config';

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <RootLayoutNav />
    </ShareIntentProvider>
  );
}

function RootLayoutNav() {
  const systemScheme = useColorScheme();
  const { themeMode, loaded: themeLoaded, loadThemeMode } = useThemeStore();
  // undefined = auth state not yet resolved (loading)
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const setRepo = useNotesStore((s) => s.setRepo);
  const router = useRouter();
  const segments = useSegments();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useNotesWatcher();

  useEffect(() => { loadThemeMode(); }, [loadThemeMode]);

  // Open a fresh note editor pre-filled with text shared in from another app.
  useEffect(() => {
    if (!user || !hasShareIntent || !shareIntent.text) return;
    router.push({ pathname: '/note/[id]', params: { id: 'new', sharedText: shareIntent.text } });
    resetShareIntent();
  }, [user, hasShareIntent, shareIntent, resetShareIntent, router]);

  const effectiveScheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    return onAuthStateChanged(getAuth(), (u) => {
      setUser(u);
      if (u) {
        setRepo(createFirestoreRepo(u.uid));
      } else {
        setRepo(null as never);
      }
    });
  }, [setRepo]);

  useEffect(() => {
    if (user === undefined) return;
    const inSignIn = segments[0] === 'sign-in';
    if (!user && !inSignIn) {
      router.replace('/sign-in');
    } else if (user && inSignIn) {
      router.replace('/');
    }
  }, [user, segments]);

  // Render nothing while Firebase resolves the initial auth state to avoid
  // flashing the wrong screen before the redirect fires.
  if (user === undefined || !themeLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={effectiveScheme}>
        <Theme name={effectiveScheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: screenBackground[effectiveScheme] },
            }}
          >
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(drawer)" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="note/[id]"
              options={{
                headerShown: true,
                title: 'My Notes',
                headerStyle: { backgroundColor: screenBackground[effectiveScheme] },
              }}
            />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
