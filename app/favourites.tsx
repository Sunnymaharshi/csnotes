import { YStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavouritesScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4">
        <Text color="$color10">Favourites — coming in Phase 5.</Text>
      </YStack>
    </SafeAreaView>
  );
}
