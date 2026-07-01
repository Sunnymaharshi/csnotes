import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../data/firebase';

export async function signInWithGoogle(): Promise<void> {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google Sign-In');
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

export async function googleSignOut(): Promise<void> {
  await GoogleSignin.signOut();
  await signOut(auth);
}
