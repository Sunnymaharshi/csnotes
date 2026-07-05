import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  reauthenticateWithCredential,
  deleteUser,
} from '@react-native-firebase/auth';
import { createFirestoreRepo } from '../data/firestoreNotesRepo';
import { useAuthStore } from '../store/authStore';

// Returns the UserCredential so callers (e.g. guest→account sync) can read the
// new uid directly without racing onAuthStateChanged.
export async function signInWithGoogle() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const { idToken, accessToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error('No ID token returned from Google Sign-In');
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  return signInWithCredential(getAuth(), credential);
}

export async function googleSignOut(): Promise<void> {
  await GoogleSignin.signOut();
  await signOut(getAuth());
}

// Re-run the Google native flow to get a fresh credential and re-authenticate the
// current Firebase user. Firebase requires a recent login before sensitive ops like
// account deletion (`auth/requires-recent-login`), so this must precede deleteUser.
async function reauthenticateWithGoogle(): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('No signed-in user to re-authenticate');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const { idToken, accessToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error('No ID token returned from Google Sign-In');
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  await reauthenticateWithCredential(user, credential);
}

// Permanently delete the signed-in account: wipe the user's Firestore notes, then
// delete the Firebase auth user. Re-auth runs first so a cancelled re-auth aborts
// BEFORE any data is destroyed (leaving the account fully intact). Firestore rules
// key on request.auth.uid == uid, so the data delete must happen while the user
// still exists — hence before deleteUser. onAuthStateChanged (app/_layout) fires
// null once the user is gone and the auth wall routes back to /sign-in.
export async function deleteAccount(): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('No signed-in user to delete');
  const uid = user.uid;
  await reauthenticateWithGoogle();
  await createFirestoreRepo(uid).deleteEverything();
  await deleteUser(getAuth().currentUser!);
  // Best-effort cleanup — the account is already gone, so don't surface failures here.
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
  await useAuthStore.getState().setGuest(false);
}
