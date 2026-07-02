import { YStack, Text, useTheme } from 'tamagui';
import { Inbox } from 'lucide-react-native';
import { ICON } from '../lib/icons';

export function EmptyState({ label = 'No Notes' }: { label?: string }) {
  const theme = useTheme();
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$3" padding="$6">
      <Inbox size={ICON.empty} strokeWidth={1.5} color={theme.color8.val} />
      <Text fontSize="$6" fontWeight="600" color="$color10">
        {label}
      </Text>
    </YStack>
  );
}
