import { memo } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Separator, useTheme } from 'tamagui';
import { Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Star, Archive, Trash2, Settings } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../../src/lib/icons';
import { PressableScale } from '../../src/components/PressableScale';
import { useBottomNavStore } from '../../src/store/bottomNavStore';

export type NavItem = { label: string; route: string; icon: typeof ClipboardList };
type IconType = NavItem['icon'];

const NAV_ITEMS: NavItem[] = [
  { label: 'All Notes', route: '/', icon: ClipboardList },
];

export const CATEGORY_ITEMS: NavItem[] = [
  { label: 'Favourites', route: '/favourites', icon: Star },
  { label: 'Archived', route: '/archived', icon: Archive },
  { label: 'Trash', route: '/trash', icon: Trash2 },
];

// Destinations for the bottom-nav Menu sheet (§8.5): the "extras" not already
// one-tap on the bar (All Notes + Favourites live on the bar itself).
export const BOTTOM_NAV_MENU_ITEMS: NavItem[] = [
  ...CATEGORY_ITEMS.filter((i) => i.route !== '/favourites'),
  { label: 'Settings', route: '/settings', icon: Settings },
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

function CustomDrawerContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <YStack paddingVertical="$5" alignItems="center" gap="$2">
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: ICON.brand, height: ICON.brand, borderRadius: ICON.brand * 0.22 }}
        />
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
            active={false}
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
            active={false}
            onPress={() => router.navigate(item.route as never)}
          />
        ))}
      </YStack>
      <Separator marginVertical="$3" borderColor="$color4" />

      <YStack paddingHorizontal="$2" paddingBottom="$4" gap="$1">
        <DrawerItem
          label="Settings"
          icon={Settings}
          active={false}
          onPress={() => router.navigate('/settings' as never)}
        />
      </YStack>
    </ScrollView>
  );
}

export default function DrawerLayout() {
  const theme = useTheme();
  // In bottom-nav mode the Menu sheet replaces the drawer, so kill the left-edge
  // open-swipe to avoid two competing navigation systems.
  const bottomNav = useBottomNavStore((s) => s.enabled);

  return (
    <Drawer
      drawerContent={() => <CustomDrawerContent />}
      screenOptions={{
        swipeEnabled: !bottomNav,
        headerStyle: { backgroundColor: theme.color1.val },
        headerTintColor: theme.color12.val,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: theme.color1.val },
        sceneStyle: { backgroundColor: theme.color1.val },
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.5)',
        // Wider edge band + shorter commit distance so the open-swipe is easy to
        // trigger without precisely starting at the screen edge (was 40/60,
        // still missed the note-list gesture too often). See react-native-drawer-layout.
        swipeEdgeWidth: 120,
        swipeMinDistance: 15,
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'All Notes' }} />
      <Drawer.Screen name="favourites" options={{ title: 'Favourites' }} />
      <Drawer.Screen name="archived" options={{ title: 'Archived' }} />
      <Drawer.Screen name="trash" options={{ title: 'Trash' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}
