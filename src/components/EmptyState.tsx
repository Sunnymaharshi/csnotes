import { YStack, Text, useTheme } from 'tamagui';
import { ClipboardList } from 'lucide-react-native';

export function EmptyState({ label = 'No Notes' }: { label?: string }) {
  const theme = useTheme();
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$3" padding="$6">
      <ClipboardList size={72} color={theme.color12.val} fill={theme.color12.val} />
      <Text fontSize="$6" fontWeight="600" color="$color12">
        {label}
      </Text>
    </YStack>
  );
}
