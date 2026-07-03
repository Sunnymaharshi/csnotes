import { memo, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { usePathname, useRouter } from 'expo-router';
import { YStack, XStack, Text, Button, Separator, useTheme } from 'tamagui';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotebookPen, ClipboardList, Star, Archive, Trash2 } from 'lucide-react-native';
import { googleSignOut } from '../../src/lib/googleAuth';
import { ICON, ICON_STROKE } from '../../src/lib/icons';
import { PressableScale } from '../../src/components/PressableScale';
import { useThemeStore, type ThemeMode } from '../../src/store/themeStore';
import { useNotesStore } from '../../src/store/notesStore';
import { exportNotes, pickAndImportNotes } from '../../src/lib/exportImport';
import { showAlert } from '../../src/lib/alert';

type IconType = typeof ClipboardList;

const NAV_ITEMS: { label: string; route: string; icon: IconType }[] = [
  { label: 'All Notes', route: '/', icon: ClipboardList },
];

const CATEGORY_ITEMS: { label: string; route: string; icon: IconType }[] = [
  { label: 'Favourites', route: '/favourites', icon: Star },
  { label: 'Archived', route: '/archived', icon: Archive },
  { label: 'Trash', route: '/trash', icon: Trash2 },
];

const DrawerItem = memo(function DrawerItem({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconType;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress}>
      <XStack
        alignItems="center"
        gap="$3"
        paddingVertical="$3"
        paddingHorizontal="$4"
        backgroundColor={active ? '$color3' : 'transparent'}
        borderRadius="$3"
      >
        <Icon size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
        <Text fontSize="$5" fontWeight={active ? '700' : '500'} color="$color12">
          {label}
        </Text>
      </XStack>
    </PressableScale>
  );
});

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function CustomDrawerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode } = useThemeStore();
  const repo = useNotesStore((s) => s.repo);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

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
      showAlert('Export failed', (e as Error).message);
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
      showAlert('Import complete', `${notes.length} note${notes.length === 1 ? '' : 's'} merged.`);
    } catch (e) {
      showAlert('Import failed', (e as Error).message);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <YStack paddingVertical="$5" alignItems="center" gap="$2">
        <NotebookPen size={ICON.brand} strokeWidth={2} color={theme.color12.val} />
        <Text fontSize="$7" fontWeight="700" color="$color12">
          CS Notes
        </Text>
      </YStack>
      <Separator marginVertical="$2" borderColor="$color4" />
      <YStack paddingHorizontal="$2" gap="$1">
        {NAV_ITEMS.map((item) => (
          <DrawerItem
            key={item.route}
            label={item.label}
            icon={item.icon}
            active={pathname === item.route}
            onPress={() => router.navigate(item.route as never)}
          />
        ))}
      </YStack>
      <Separator marginVertical="$3" borderColor="$color4" />
      <YStack paddingHorizontal="$2" gap="$1">
        <Text fontSize="$2" fontWeight="700" letterSpacing={0.8} color="$color10" paddingHorizontal="$2" paddingVertical="$2">
          CATEGORIES
        </Text>
        {CATEGORY_ITEMS.map((item) => (
          <DrawerItem
            key={item.route}
            label={item.label}
            icon={item.icon}
            active={pathname === item.route}
            onPress={() => router.navigate(item.route as never)}
          />
        ))}
      </YStack>
      <Separator marginVertical="$3" borderColor="$color4" />

      <YStack paddingHorizontal="$4" gap="$2">
        <Text fontSize="$2" fontWeight="700" letterSpacing={0.8} color="$color10" paddingHorizontal="$1">
          APPEARANCE
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

      <Separator marginVertical="$3" borderColor="$color4" />

      <YStack paddingHorizontal="$4" gap="$2">
        <Text fontSize="$2" fontWeight="700" letterSpacing={0.8} color="$color10" paddingHorizontal="$1">
          BACKUP
        </Text>
        <XStack gap="$2">
          <Button flex={1} size="$3" onPress={handleExport} disabled={exportLoading}>
            {exportLoading ? 'Exporting…' : 'Export'}
          </Button>
          <Button flex={1} size="$3" onPress={handleImport} disabled={importLoading}>
            {importLoading ? 'Importing…' : 'Import'}
          </Button>
        </XStack>
      </YStack>

      <Separator marginVertical="$3" borderColor="$color4" />

      <YStack paddingHorizontal="$4" paddingBottom="$4">
        <Button
          size="$3"
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
    </ScrollView>
  );
}

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={() => <CustomDrawerContent />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.color1.val },
        headerTintColor: theme.color12.val,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: theme.color1.val },
        sceneStyle: { backgroundColor: theme.color1.val },
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.5)',
        // Keep the open-swipe confined to a narrow left edge band so the note
        // list owns the rest of the horizontal surface — a vertical scroll that
        // starts mid-list can't accidentally grab the drawer. Defaults
        // (edgeWidth 32 / minDistance 60) also make an accidental micro-drag
        // snap back instead of committing to open. See react-native-drawer-layout.
        swipeEdgeWidth: 40,
        swipeMinDistance: 60,
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'All Notes' }} />
      <Drawer.Screen name="favourites" options={{ title: 'Favourites' }} />
      <Drawer.Screen name="archived" options={{ title: 'Archived' }} />
      <Drawer.Screen name="trash" options={{ title: 'Trash' }} />
    </Drawer>
  );
}
