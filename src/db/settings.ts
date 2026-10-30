import type { Settings } from '@/domain/types';
import { db } from './database';

const DEVICE_PREFIX = 'device:';

export const DEFAULT_SETTINGS: Settings = { language: 'auto' };

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const stored = Object.fromEntries(
    rows.filter((r) => !r.key.startsWith(DEVICE_PREFIX)).map((r) => [r.key, r.value]),
  );
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.settings.put({ key, value });
}

/** Valori privati del dispositivo (PIN, credenziali): mai inclusi nei backup. */
export async function getDeviceSecret<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(`${DEVICE_PREFIX}${key}`))?.value as T | undefined;
}

export async function setDeviceSecret(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key: `${DEVICE_PREFIX}${key}`, value });
}

export async function clearDeviceSecret(key: string): Promise<void> {
  await db.settings.delete(`${DEVICE_PREFIX}${key}`);
}
