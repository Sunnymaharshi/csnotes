import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useNotesStore } from '../src/store/notesStore';
import { createFirestoreRepo } from '../src/data/firestoreNotesRepo';
import { localRepo } from '../src/data/localNotesRepo';
import { useAuthStore } from '../src/store/authStore';
import { useNotesWatcher } from '../src/hooks/useNotesWatcher';
import { useThemeStore } from '../src/store/themeStore';
import { useSortStore } from '../src/store/sortStore';
import { useLayoutStore } from '../src/store/layoutStore';
import { useBottomNavStore } from '../src/store/bottomNavStore';
import { ThemedAlert } from '../src/components/ThemedAlert';
import { LinkOptionsMenu } from '../src/components/LinkOptionsMenu';
import { SortMenu } from '../src/components/SortMenu';
import tamaguiConfig, { screenBackground, primaryText } from '../tamagui.config';

SplashScreen.preventAutoHideAsync();

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
  const loadLayout = useLayoutStore((s) => s.loadLayout);
  const loadBottomNav = useBottomNavStore((s) => s.loadBottomNav);
  const bottomNavLoaded = useBottomNavStore((s) => s.loaded);
  const isGuest = useAuthStore((s) => s.isGuest);
  const authLoaded = useAuthStore((s) => s.loaded);
  const loadGuest = useAuthStore((s) => s.loadGuest);

  // A user is "authed" (allowed past the login wall) if signed in OR using guest mode.
  const authed = !!user || isGuest;

  useEffect(() => { loadThemeMode(); }, [loadThemeMode]);
  useEffect(() => { loadSort(); }, [loadSort]);
  useEffect(() => { loadLayout(); }, [loadLayout]);
  useEffect(() => { loadBottomNav(); }, [loadBottomNav]);
  useEffect(() => { loadGuest(); }, [loadGuest]);

  // Open a fresh note editor pre-filled with text shared in from another app.
  // Uses push (not replace) so the notes list stays underneath in history —
  // that's what makes React Navigation render a normal back button in the
  // header, so back returns to the notes list.
  useEffect(() => {
    if (!authed || !shareIntentReady || !hasShareIntent || !shareIntent.text) return;
    router.push({
      pathname: '/note/[id]',
      params: { id: 'new', sharedText: shareIntent.text },
    });
    resetShareIntent();
  }, [authed, shareIntentReady, hasShareIntent, shareIntent, resetShareIntent, router]);

  const effectiveScheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    return onAuthStateChanged(getAuth(), setUser);
  }, []);

  // Inject the active repo. A signed-in user always wins over the guest flag, so
  // signing in to sync never flickers back to the empty local repo.
  useEffect(() => {
    if (user === undefined) return; // auth still resolving
    if (user) {
      setRepo(createFirestoreRepo(user.uid));
    } else if (isGuest) {
      setRepo(localRepo);
    } else {
      setRepo(null as never);
    }
  }, [user, isGuest, setRepo]);

  // Once a real account is present the guest session is over. Clearing the flag
  // here (not only on a successful sync) keeps the UI consistent even if the
  // note migration failed mid-way — the local notes stay on disk, recoverable.
  useEffect(() => {
    if (user && isGuest) useAuthStore.getState().setGuest(false);
  }, [user, isGuest]);

  useEffect(() => {
    if (user === undefined || !authLoaded) return;
    const inSignIn = segments[0] === 'sign-in';
    if (!authed && !inSignIn) {
      router.replace('/sign-in');
    } else if (authed && inSignIn) {
      router.replace('/');
    }
  }, [authed, user, authLoaded, segments]);

  // Render nothing while Firebase resolves the initial auth state, or while
  // the share-intent module hasn't resolved yet — otherwise the notes list
  // would mount and paint for a frame before the share-intent redirect fires.
  // Native splash screen stays up (preventAutoHideAsync above) until then.
  const isReady = user !== undefined && themeLoaded && authLoaded && bottomNavLoaded && shareIntentReady;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

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
