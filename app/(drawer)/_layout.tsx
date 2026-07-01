import { Drawer } from 'expo-router/drawer';
import { usePathname, useRouter } from 'expo-router';
import { YStack, XStack, Text, Separator, useTheme } from 'tamagui';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, ClipboardList, Settings } from 'lucide-react-native';

type IconType = typeof ClipboardList;

const NAV_ITEMS: { label: string; route: string; icon: IconType }[] = [
  { label: 'CS Notes', route: '/', icon: ClipboardList },
];

function DrawerItem({
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
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <XStack
        alignItems="center"
        gap="$3"
        paddingVertical="$3"
        paddingHorizontal="$4"
        backgroundColor={active ? '$color3' : 'transparent'}
        borderRadius="$3"
      >
        <Icon size={22} color={theme.color12.val} />
        <Text fontSize="$5" fontWeight={active ? '700' : '500'} color="$color12">
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

function CustomDrawerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <YStack paddingVertical="$5" alignItems="center" gap="$2">
        <Moon size={56} color={theme.color12.val} fill={theme.color12.val} />
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
            onPress={() => router.push(item.route as never)}
          />
        ))}
      </YStack>
      <Separator marginVertical="$3" borderColor="$color4" />
      <YStack paddingHorizontal="$2">
        <DrawerItem
          label="Settings"
          icon={Settings}
          active={pathname === '/settings'}
          onPress={() => router.push('/settings')}
        />
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
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'CS Notes' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      <Drawer.Screen name="favourites" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="archived" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="trash" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
