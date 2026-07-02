import { Modal, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useAlertStore, type AlertButton } from '../store/alertStore';

/** Global themed dialog host — mount once at the app root. Rendered off state
 * pushed via showAlert() so it always matches the monochrome theme instead of
 * the OS's native Alert.alert look. */
export function ThemedAlert() {
  const { visible, title, message, buttons, hide } = useAlertStore();

  function handlePress(button: AlertButton) {
    hide();
    button.onPress?.();
  }

  // Mirrors native Android's cancelable-by-default Alert: back button / tapping
  // outside dismisses without invoking any button's onPress.
  function handleDismiss() {
    hide();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable onPress={() => {}}>
          <YStack
            backgroundColor="$color2"
            borderRadius="$5"
            borderWidth={1}
            borderColor="$color4"
            padding="$4"
            gap="$3"
            width={300}
            elevation={8}
          >
            <Text fontSize="$5" fontWeight="700" color="$color12">
              {title}
            </Text>
            {message ? (
              <Text fontSize="$3" color="$color10" lineHeight={20}>
                {message}
              </Text>
            ) : null}
            <XStack justifyContent="flex-end" gap="$5" paddingTop="$2">
              {buttons.map((button, i) => (
                <Pressable
                  key={`${button.text}-${i}`}
                  onPress={() => handlePress(button)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text
                    fontSize="$4"
                    fontWeight={button.style === 'destructive' ? '700' : '600'}
                    color={button.style === 'cancel' ? '$color9' : '$color12'}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
