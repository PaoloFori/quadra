const ITERATIONS = 150_000;

export interface PinRecord {
  salt: string;
  hash: string;
}

export const PIN_PATTERN = /^\d{4,8}$/;

const toB64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  );
  return toB64(new Uint8Array(bits));
}

export async function createPinRecord(pin: string): Promise<PinRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), hash: await derive(pin, salt) };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  const candidate = await derive(pin, fromB64(record.salt));
  // Confronto a tempo costante sulla lunghezza fissa dell'hash.
  let diff = candidate.length ^ record.hash.length;
  for (let i = 0; i < candidate.length; i++)
    diff |= candidate.charCodeAt(i) ^ (record.hash.charCodeAt(i) || 0);
  return diff === 0;
}

/** Secondi di attesa dopo troppi tentativi sbagliati (0 = nessuna attesa). */
export function lockoutSeconds(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  return Math.min(300, 15 * 2 ** (failedAttempts - 5));
}
