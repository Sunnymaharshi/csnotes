import * as ExpoCrypto from 'expo-crypto';

export function randomUUID(): string {
  return ExpoCrypto.randomUUID();
}
