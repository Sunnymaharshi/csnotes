import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../src/data/firebase';
import { useNotesStore } from '../src/store/notesStore';
import { createFirestoreRepo } from '../src/data/firestoreNotesRepo';
import tamaguiConfig from '../tamagui.config';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // undefined = auth state not yet resolved (loading)
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const setRepo = useNotesStore((s) => s.setRepo);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
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
  if (user === undefined) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
      <Theme name={colorScheme === 'dark' ? 'dark' : 'light'}>
        <Stack>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: 'CS Notes' }} />
          <Stack.Screen name="favourites" options={{ title: 'Favourites' }} />
          <Stack.Screen name="archived" options={{ title: 'Archived' }} />
          <Stack.Screen name="trash" options={{ title: 'Trash' }} />
          <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </Theme>
    </TamaguiProvider>
  );
}
