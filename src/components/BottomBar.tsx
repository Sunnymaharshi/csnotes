import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Star, Search, Menu, LayoutGrid, List, Sun, Moon } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../lib/icons';
import { useLayoutStore } from '../store/layoutStore';
import { useThemeStore } from '../store/themeStore';
import { tapFeedback } from '../lib/haptics';
import { BOTTOM_NAV_MENU_ITEMS } from '../../app/(drawer)/_layout';
import { BottomSheetSections } from './BottomSheet';
import type { OverflowItem } from './OverflowMenu';

/** Height of the bottom bar's content (excludes the safe-area inset below it). */
export const BOTTOM_BAR_HEIGHT = 56;

/**
 * The bottom app bar shown when bottom-nav mode is on (§8.5). The bar is pure
 * navigation + Search; a single hamburger opens one sectioned sheet for
 * everything else (no redundant second "more" button):
 *   [🗒 All Notes] [★ Favourites] [🔍 Search] [≡]
 * Sheet — actions: Sort, Layout (+ Restore/Clear on Trash); go to: Archived,
 * Trash, Settings. The new-note FAB stays floating (rendered by the screen).
 */
export function BottomBar({
  actionItems,
  onSearch,
}: {
  // Sort (+ Trash Restore/Clear) — globalOverflowItems with Search omitted.
  actionItems: OverflowItem[];
  onSearch: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayoutStore((s) => s.layout);
  const toggleLayout = useLayoutStore((s) => s.toggle);
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const systemScheme = useColorScheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // Layout is a dedicated icon in the top-header layout; here it joins the
  // actions section. Show the label/icon of the layout you'd switch *to*.
  const layoutItem = useMemo<OverflowItem>(
    () => ({
      label: layout === 'list' ? 'Grid view' : 'List view',
      icon: layout === 'list' ? LayoutGrid : List,
      onPress: () => {
        tapFeedback();
        toggleLayout();
      },
    }),
    [layout, toggleLayout],
  );

  // Quick light⇄dark toggle (no System option — that lives in Settings). Show
  // the icon/label of the theme you'd switch *to*.
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const themeItem = useMemo<OverflowItem>(
    () => ({
      label: isDark ? 'Light theme' : 'Dark theme',
      icon: isDark ? Sun : Moon,
      onPress: () => {
        tapFeedback();
        setThemeMode(isDark ? 'light' : 'dark');
      },
    }),
    [isDark, setThemeMode],
  );

  const navItems = useMemo<OverflowItem[]>(
    () =>
      BOTTOM_NAV_MENU_ITEMS.map((item) => ({
        label: item.label,
        icon: item.icon,
        onPress: () => router.navigate(item.route as never),
      })),
    [router],
  );

  const sections = useMemo(
    () => [
      { label: 'Actions', items: [...actionItems, layoutItem, themeItem] },
      { label: 'Go to', items: navItems },
    ],
    [actionItems, layoutItem, themeItem, navItems],
  );

  return (
    <>
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        height={BOTTOM_BAR_HEIGHT + insets.bottom}
        paddingBottom={insets.bottom}
        paddingHorizontal="$3"
        alignItems="center"
        backgroundColor="$color2"
        borderTopWidth={1}
        borderTopColor="$color4"
      >
        <BarButton icon={ClipboardList} onPress={() => router.push('/')} color={theme.color12.val} />
        <BarButton icon={Star} onPress={() => router.push('/favourites')} color={theme.color12.val} />
        <BarButton icon={Search} onPress={onSearch} color={theme.color12.val} />
        <BarButton icon={Menu} onPress={() => setMenuOpen(true)} color={theme.color12.val} />
      </XStack>

      <BottomSheetSections visible={menuOpen} onClose={() => setMenuOpen(false)} sections={sections} />
    </>
  );
}

function BarButton({
  icon: Icon,
  onPress,
  color,
}: {
  icon: typeof Menu;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.barButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon size={ICON.md} strokeWidth={ICON_STROKE} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
});
