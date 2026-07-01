import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from '@react-native-firebase/auth';

export async function signInWithGoogle(): Promise<void> {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const { idToken, accessToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error('No ID token returned from Google Sign-In');
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  await signInWithCredential(getAuth(), credential);
}

export async function googleSignOut(): Promise<void> {
  await GoogleSignin.signOut();
  await signOut(getAuth());
}
