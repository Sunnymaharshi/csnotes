import { StyleSheet, TextInput, Pressable } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { Search, X } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../lib/icons';

export function SearchBar({
  value,
  onChangeText,
  onClose,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <XStack
      marginHorizontal="$4"
      marginTop="$2"
      marginBottom="$1"
      paddingHorizontal="$3"
      paddingVertical="$2"
      backgroundColor="$color3"
      borderRadius="$4"
      alignItems="center"
      gap="$2"
    >
      <Search size={ICON.sm} strokeWidth={ICON_STROKE} color={theme.color9.val} />
      <TextInput
        style={[styles.input, { color: theme.color12.val }]}
        placeholder="Search notes…"
        placeholderTextColor={theme.color9.val}
        value={value}
        onChangeText={onChangeText}
        autoFocus
        returnKeyType="search"
      />
      <Pressable onPress={onClose} hitSlop={8}>
        <X size={ICON.sm} strokeWidth={ICON_STROKE} color={theme.color9.val} />
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
