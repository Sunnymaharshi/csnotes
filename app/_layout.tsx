import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useNotesStore } from '../src/store/notesStore';
import { createFirestoreRepo } from '../src/data/firestoreNotesRepo';
import { useNotesWatcher } from '../src/hooks/useNotesWatcher';
import { useThemeStore } from '../src/store/themeStore';
import { useSortStore } from '../src/store/sortStore';
import { ThemedAlert } from '../src/components/ThemedAlert';
import { LinkOptionsMenu } from '../src/components/LinkOptionsMenu';
import { SortMenu } from '../src/components/SortMenu';
import tamaguiConfig, { screenBackground, primaryText } from '../tamagui.config';

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
  const { isReady: shareIntentReady, hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useNotesWatcher();

  const loadSort = useSortStore((s) => s.loadSort);

  useEffect(() => { loadThemeMode(); }, [loadThemeMode]);
  useEffect(() => { loadSort(); }, [loadSort]);

  // Open a fresh note editor pre-filled with text shared in from another app.
  // Uses push (not replace) so the notes list stays underneath in history —
  // that's what makes React Navigation render a normal back button in the
  // header, so back returns to the notes list.
  useEffect(() => {
    if (!user || !shareIntentReady || !hasShareIntent || !shareIntent.text) return;
    router.push({
      pathname: '/note/[id]',
      params: { id: 'new', sharedText: shareIntent.text },
    });
    resetShareIntent();
  }, [user, shareIntentReady, hasShareIntent, shareIntent, resetShareIntent, router]);

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

  // Render nothing while Firebase resolves the initial auth state, or while
  // the share-intent module hasn't resolved yet — otherwise the notes list
  // would mount and paint for a frame before the share-intent redirect fires.
  if (user === undefined || !themeLoaded || !shareIntentReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={effectiveScheme}>
        <Theme name={effectiveScheme}>
          <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
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
                headerTintColor: primaryText[effectiveScheme],
                headerTitleStyle: { fontWeight: '700' },
                headerShadowVisible: true,
              }}
            />
          </Stack>
          <ThemedAlert />
          <LinkOptionsMenu />
          <SortMenu />
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
