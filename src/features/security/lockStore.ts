import { clearDeviceSecret, getDeviceSecret, setDeviceSecret } from '@/db/settings';
import { createPinRecord, PIN_PATTERN, type PinRecord } from '@/domain/security/pin';

const PIN_KEY = 'pin';
const BIO_KEY = 'biometricCredential';

export interface LockConfig {
  pin: PinRecord | null;
  biometricCredential: string | null;
}

export async function loadLockConfig(): Promise<LockConfig> {
  const [pin, biometricCredential] = await Promise.all([
    getDeviceSecret<PinRecord>(PIN_KEY),
    getDeviceSecret<string>(BIO_KEY),
  ]);
  return { pin: pin ?? null, biometricCredential: biometricCredential ?? null };
}

export async function savePin(pin: string): Promise<void> {
  if (!PIN_PATTERN.test(pin)) throw new Error('Invalid PIN');
  await setDeviceSecret(PIN_KEY, await createPinRecord(pin));
}

export async function removeLock(): Promise<void> {
  await Promise.all([clearDeviceSecret(PIN_KEY), clearDeviceSecret(BIO_KEY)]);
}

export const saveBiometricCredential = (id: string): Promise<void> => setDeviceSecret(BIO_KEY, id);
export const removeBiometricCredential = (): Promise<void> => clearDeviceSecret(BIO_KEY);
