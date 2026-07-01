import { Platform } from 'react-native';

export function randomUUID(): string {
  if (Platform.OS === 'web' && typeof crypto !== 'undefined') {
    return crypto.randomUUID();
  }
  // React Native Hermes has crypto.randomUUID available via polyfill in RN 0.71+
  return (crypto as Crypto).randomUUID();
}
