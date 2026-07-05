import { Modal, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { Check, type LucideIcon } from 'lucide-react-native';
import { useSortStore, type SortField, type SortDir } from '../store/sortStore';
import { useBottomNavStore } from '../store/bottomNavStore';
import { BottomSheet } from './BottomSheet';
import { ICON, ICON_STROKE } from '../lib/icons';
import { tapFeedback } from '../lib/haptics';

/** Global themed sort menu — mount once at the app root. Opened from the list
 * overflow menu; lets the user pick the field (Created / Updated) and direction
 * (Newest / Oldest) independently, each row showing a check on the active choice
 * so the effect is visible immediately without a toast. */
export function SortMenu() {
  const { field, dir, menuVisible, setField, setDir, closeMenu } = useSortStore();

  const selectField = (value: SortField) => {
    setField(value);
    closeMenu();
  };
  const selectDir = (value: SortDir) => {
    setDir(value);
    closeMenu();
  };
  const theme = useTheme();
  const bottomNav = useBottomNavStore((s) => s.enabled);

  const fieldRows: { value: SortField; label: string }[] = [
    { value: 'created', label: 'Created date' },
    { value: 'updated', label: 'Updated date' },
  ];
  const dirRows: { value: SortDir; label: string }[] = [
    { value: 'desc', label: 'Newest first' },
    { value: 'asc', label: 'Oldest first' },
  ];

  const rows = (
    <>
      <SectionLabel>Sort by</SectionLabel>
      {fieldRows.map((row) => (
        <Row
          key={row.value}
          label={row.label}
          active={field === row.value}
          onPress={() => selectField(row.value)}
          theme={theme}
        />
      ))}

      <YStack height={StyleSheet.hairlineWidth} backgroundColor="$color4" marginVertical={4} />

      <SectionLabel>Order</SectionLabel>
      {dirRows.map((row) => (
        <Row
          key={row.value}
          label={row.label}
          active={dir === row.value}
          onPress={() => selectDir(row.value)}
          theme={theme}
        />
      ))}
    </>
  );

  // In bottom-nav mode the sort menu reuses the draggable BottomSheet (thumb
  // zone, §8.5) to match the other bottom sheets; otherwise it drops from the
  // top-right overflow.
  if (bottomNav) {
    return (
      <BottomSheet visible={menuVisible} onClose={closeMenu}>
        {rows}
      </BottomSheet>
    );
  }

  return (
    <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
      <Pressable style={styles.backdrop} onPress={closeMenu}>
        <YStack
          position="absolute"
          top="$6"
          right="$4"
          borderRadius={14}
          elevation={3}
          shadowColor="#000"
          shadowOpacity={0.18}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 6 }}
        >
          <YStack
            backgroundColor="$color1"
            borderRadius={14}
            borderWidth={StyleSheet.hairlineWidth}
            borderColor="$color4"
            paddingVertical={4}
            minWidth={220}
            overflow="hidden"
          >
            {rows}
          </YStack>
        </YStack>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="$2"
      fontWeight="600"
      color="$color10"
      paddingHorizontal={18}
      paddingTop={8}
      paddingBottom={4}
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

function Row({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const CheckIcon: LucideIcon = Check;
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      android_ripple={{ color: theme.color4.val }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.color3.val }]}
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text fontSize="$4" fontWeight="500" color="$color12">
          {label}
        </Text>
        {active ? (
          <CheckIcon size={ICON.sm} strokeWidth={ICON_STROKE} color={theme.color12.val} />
        ) : null}
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  row: { paddingVertical: 11, paddingHorizontal: 18 },
});
