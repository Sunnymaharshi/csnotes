import { useState } from 'react';
import { YStack, XStack, Text, Separator, useTheme } from 'tamagui';
import { Image, ScrollView, Linking, Share, StyleSheet } from 'react-native';
import { PressableScale } from '../../src/components/PressableScale';
import { getAuth } from '@react-native-firebase/auth';
import { UserCircle } from 'lucide-react-native';
import { useThemeStore, type ThemeMode } from '../../src/store/themeStore';
import { useBottomNavStore } from '../../src/store/bottomNavStore';
import { useNotesStore } from '../../src/store/notesStore';
import { useAuthStore } from '../../src/store/authStore';
import { signInAndSync } from '../../src/lib/syncGuest';
import { googleSignOut, deleteAccount } from '../../src/lib/googleAuth';
import { exportNotes, pickAndImportNotes } from '../../src/lib/exportImport';
import {
  confirmDeleteEverything,
  confirmSignOut,
  confirmDeleteAccount,
} from '../../src/lib/globalOverflowActions';
import { showAlert } from '../../src/lib/alert';
import { showToast, noteCount } from '../../src/lib/toast';
import { ICON, ICON_STROKE } from '../../src/lib/icons';

const APP_PACKAGE = 'com.sunny.csnotes';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const NAV_OPTIONS: { label: string; value: boolean }[] = [
  { label: 'Top', value: false },
  { label: 'Bottom', value: true },
];

async function handleRateApp() {
  // Prefer the native Play Store app; fall back to the web listing.
  const marketUrl = `market://details?id=${APP_PACKAGE}`;
  try {
    if (await Linking.canOpenURL(marketUrl)) {
      await Linking.openURL(marketUrl);
    } else {
      await Linking.openURL(PLAY_STORE_URL);
    }
  } catch {
    showToast("Couldn't open Play Store");
  }
}

async function handleShareApp() {
  try {
    await Share.share({
      message: `Check out CS Notes — a simple notes app.\n${PLAY_STORE_URL}`,
    });
  } catch {
    // User dismissed the share sheet — nothing to do.
  }
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize="$2" fontWeight="700" letterSpacing={0.8} color="$color10" paddingHorizontal="$1">
      {children}
    </Text>
  );
}

/**
 * Full-area tappable button — Tamagui's <Button> only registered presses on its
 * text label here, so all settings buttons use PressableScale (the app's
 * standard tappable) wrapping a styled frame instead.
 */
function SettingsButton({
  label,
  onPress,
  disabled = false,
  fill = false,
  tall = false,
  backgroundColor = '$color4',
  color = '$color12',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fill?: boolean;
  tall?: boolean;
  backgroundColor?: string;
  color?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      style={fill ? styles.fill : undefined}
    >
      <XStack
        height={tall ? 48 : 40}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="$4"
        borderRadius="$4"
        backgroundColor={backgroundColor}
        opacity={disabled ? 0.5 : 1}
      >
        <Text fontSize={tall ? '$5' : '$4'} fontWeight="600" color={color}>
          {label}
        </Text>
      </XStack>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeStore();
  const bottomNav = useBottomNavStore((s) => s.enabled);
  const setBottomNav = useBottomNavStore((s) => s.setEnabled);
  const repo = useNotesStore((s) => s.repo);
  const totalCount = useNotesStore((s) => s.allNotes.length + s.archived.length + s.trash.length);
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = getAuth().currentUser;

  const [syncLoading, setSyncLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const accountBusy = syncLoading || signOutLoading || deleteAccountLoading;

  async function handleSignInSync() {
    setSyncLoading(true);
    try {
      // The guest flag is cleared centrally once the account resolves (app/_layout).
      const migrated = await signInAndSync();
      showToast(migrated ? `${noteCount(migrated)} synced` : 'Signed in');
    } catch (e) {
      const msg = (e as { message?: string }).message ?? String(e);
      if (!/cancel/i.test(msg)) {
        showAlert("Couldn't sync", `${msg}\n\nYour notes are still saved on this device.`);
      }
    } finally {
      setSyncLoading(false);
    }
  }

  function handleSignOut() {
    confirmSignOut(async () => {
      setSignOutLoading(true);
      try {
        // Auth wall (app/_layout) routes back to /sign-in once the user clears.
        await googleSignOut();
      } catch (e) {
        setSignOutLoading(false);
        showAlert("Couldn't sign out", (e as Error).message);
      }
    });
  }

  function handleDeleteAccount() {
    confirmDeleteAccount(async () => {
      setDeleteAccountLoading(true);
      try {
        await deleteAccount();
        // On success onAuthStateChanged fires null and routes to /sign-in.
      } catch (e) {
        setDeleteAccountLoading(false);
        const msg = (e as { message?: string }).message ?? String(e);
        // Swallow the user-cancelled re-auth case; surface real failures.
        if (!/cancel/i.test(msg)) {
          showAlert("Couldn't delete account", msg);
        }
      }
    });
  }

  async function handleExport() {
    if (!repo) return;
    setExportLoading(true);
    try {
      const notes = await repo.exportNotes();
      const filename = await exportNotes(notes);
      showAlert('Backup saved', `${noteCount(notes.length)} saved as ${filename} in your backup folder.`);
    } catch (e) {
      showAlert('Export failed', (e as Error).message);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleImport() {
    if (!repo) return;
    setImportLoading(true);
    try {
      // Opens the system file manager so the user can browse to their backup
      // folder (e.g. CS Notes) and pick a file.
      const notes = await pickAndImportNotes();
      if (notes.length === 0) return;
      await repo.importNotes(notes);
      showAlert('Import complete', `${notes.length} note${notes.length === 1 ? '' : 's'} merged.`);
    } catch (e) {
      showAlert('Import failed', (e as Error).message);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <YStack gap="$5">
        <YStack gap="$3">
          <SectionLabel>ACCOUNT</SectionLabel>
          {isGuest ? (
            <YStack gap="$2">
              <SettingsButton
                tall
                backgroundColor="$color12"
                color="$color1"
                onPress={handleSignInSync}
                disabled={accountBusy}
                label={syncLoading ? 'Signing in…' : 'Sign in to sync'}
              />
              <Text fontSize="$2" color="$color9" paddingHorizontal="$1">
                Sign in to back up and sync your notes across devices.
              </Text>
            </YStack>
          ) : (
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={{ width: ICON.brand, height: ICON.brand, borderRadius: ICON.brand / 2 }}
                  />
                ) : (
                  <UserCircle size={ICON.brand} strokeWidth={ICON_STROKE} color={theme.color10.val} />
                )}
                <YStack flex={1}>
                  {user?.displayName ? (
                    <Text fontSize="$6" fontWeight="700" color="$color12">
                      {user.displayName}
                    </Text>
                  ) : null}
                  {user?.email ? (
                    <Text fontSize="$3" color="$color10">
                      {user.email}
                    </Text>
                  ) : null}
                </YStack>
              </XStack>
              <SettingsButton
                tall
                onPress={handleSignOut}
                disabled={accountBusy}
                label={signOutLoading ? 'Signing out…' : 'Sign out'}
              />
            </YStack>
          )}
        </YStack>

        <Separator borderColor="$color4" />

        <YStack gap="$2">
          <SectionLabel>APPEARANCE</SectionLabel>
          <Text fontSize="$3" color="$color11" paddingHorizontal="$1">Theme</Text>
          <XStack gap="$2">
            {THEME_OPTIONS.map(({ label, value }) => (
              <SettingsButton
                key={value}
                fill
                label={label}
                onPress={() => setThemeMode(value)}
                backgroundColor={themeMode === value ? '$color8' : '$color3'}
                color={themeMode === value ? '$color1' : '$color11'}
              />
            ))}
          </XStack>
          <Text fontSize="$3" color="$color11" paddingHorizontal="$1" paddingTop="$2">Navigation bar</Text>
          <XStack gap="$2">
            {NAV_OPTIONS.map(({ label, value }) => (
              <SettingsButton
                key={label}
                fill
                label={label}
                onPress={() => setBottomNav(value)}
                backgroundColor={bottomNav === value ? '$color8' : '$color3'}
                color={bottomNav === value ? '$color1' : '$color11'}
              />
            ))}
          </XStack>
        </YStack>

        <Separator borderColor="$color4" />

        <YStack gap="$2">
          <SectionLabel>BACKUP</SectionLabel>
          <XStack gap="$2">
            <SettingsButton
              fill
              onPress={handleExport}
              disabled={exportLoading}
              label={exportLoading ? 'Exporting…' : 'Export'}
            />
            <SettingsButton
              fill
              onPress={handleImport}
              disabled={importLoading}
              label={importLoading ? 'Importing…' : 'Import'}
            />
          </XStack>
        </YStack>

        <Separator borderColor="$color4" />

        <YStack gap="$2">
          <SectionLabel>ABOUT</SectionLabel>
          <XStack gap="$2">
            <SettingsButton fill label="Rate App" onPress={handleRateApp} />
            <SettingsButton fill label="Share App" onPress={handleShareApp} />
          </XStack>
        </YStack>

        <Separator borderColor="$color4" />

        <YStack gap="$2">
          <SectionLabel>DANGER ZONE</SectionLabel>
          <SettingsButton
            tall
            backgroundColor="$red10"
            color="white"
            label="Delete Everything"
            onPress={() => repo && confirmDeleteEverything(repo, totalCount)}
          />
          <Text fontSize="$2" color="$color9" paddingHorizontal="$1">
            Permanently deletes every note on this device, including Trash. This cannot be undone.
          </Text>
          {!isGuest ? (
            <>
              <YStack marginTop="$2">
                <SettingsButton
                  tall
                  backgroundColor="$red10"
                  color="white"
                  onPress={handleDeleteAccount}
                  disabled={accountBusy}
                  label={deleteAccountLoading ? 'Deleting account…' : 'Delete account'}
                />
              </YStack>
              <Text fontSize="$2" color="$color9" paddingHorizontal="$1">
                Permanently deletes your account and all notes from every device. This cannot be undone.
              </Text>
            </>
          ) : null}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
