import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getAuth, onAuthStateChanged, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useNotesStore } from '../src/store/notesStore';
import { createFirestoreRepo } from '../src/data/firestoreNotesRepo';
import { useNotesWatcher } from '../src/hooks/useNotesWatcher';
import { useThemeStore } from '../src/store/themeStore';
import tamaguiConfig from '../tamagui.config';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const { themeMode, loaded: themeLoaded, loadThemeMode } = useThemeStore();
  // undefined = auth state not yet resolved (loading)
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(undefined);
  const setRepo = useNotesStore((s) => s.setRepo);
  const router = useRouter();
  const segments = useSegments();
  useNotesWatcher();

  useEffect(() => { loadThemeMode(); }, [loadThemeMode]);

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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(drawer)" />
            <Stack.Screen name="note/[id]" options={{ headerShown: true, title: 'My Notes' }} />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
