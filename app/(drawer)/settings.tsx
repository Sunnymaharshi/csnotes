import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, Button, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { googleSignOut } from '../../src/lib/googleAuth';
import { useThemeStore, type ThemeMode } from '../../src/store/themeStore';
import { useNotesStore } from '../../src/store/notesStore';
import { exportNotes, pickAndImportNotes } from '../../src/lib/exportImport';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const { themeMode, setThemeMode } = useThemeStore();
  const repo = useNotesStore((s) => s.repo);

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      await googleSignOut();
    } finally {
      setSignOutLoading(false);
    }
  }

  async function handleExport() {
    if (!repo) return;
    setExportLoading(true);
    try {
      const notes = await repo.exportNotes();
      await exportNotes(notes);
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleImport() {
    if (!repo) return;
    setImportLoading(true);
    try {
      const notes = await pickAndImportNotes();
      if (notes.length === 0) return;
      await repo.importNotes(notes);
      Alert.alert('Import complete', `${notes.length} note${notes.length === 1 ? '' : 's'} merged.`);
    } catch (e) {
      Alert.alert('Import failed', (e as Error).message);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" gap="$5">
        {/* Appearance */}
        <YStack gap="$2">
          <Text fontSize="$3" fontWeight="600" color="$color11" textTransform="uppercase" letterSpacing={1}>
            Appearance
          </Text>
          <XStack gap="$2">
            {THEME_OPTIONS.map(({ label, value }) => (
              <Button
                key={value}
                flex={1}
                size="$3"
                onPress={() => setThemeMode(value)}
                backgroundColor={themeMode === value ? '$color8' : '$color3'}
                color={themeMode === value ? '$color1' : '$color11'}
                borderWidth={0}
                pressStyle={{ opacity: 0.8 }}
              >
                {label}
              </Button>
            ))}
          </XStack>
        </YStack>

        <Separator />

        {/* Backup */}
        <YStack gap="$2">
          <Text fontSize="$3" fontWeight="600" color="$color11" textTransform="uppercase" letterSpacing={1}>
            Backup
          </Text>
          <Text fontSize="$3" color="$color10">
            Export all notes as JSON, or import from a previous backup (notes are merged by ID — existing notes are not deleted).
          </Text>
          <XStack gap="$2" marginTop="$1">
            <Button
              flex={1}
              size="$4"
              onPress={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              flex={1}
              size="$4"
              onPress={handleImport}
              disabled={importLoading}
            >
              {importLoading ? 'Importing…' : 'Import'}
            </Button>
          </XStack>
        </YStack>

        <Separator />

        <Button
          size="$4"
          backgroundColor="$color12"
          color="$color1"
          borderWidth={0}
          pressStyle={{ opacity: 0.8 }}
          onPress={handleSignOut}
          disabled={signOutLoading}
        >
          {signOutLoading ? 'Signing out…' : 'Sign out'}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
