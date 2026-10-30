import { describe, expect, it } from 'vitest';
import { createPinRecord, lockoutSeconds, PIN_PATTERN, verifyPin } from '@/domain/security/pin';

describe('PIN', () => {
  it('verifica il PIN corretto e rifiuta quello sbagliato', async () => {
    const record = await createPinRecord('1234');
    expect(await verifyPin('1234', record)).toBe(true);
    expect(await verifyPin('1235', record)).toBe(false);
  });
  it('salt diverso a ogni creazione, PIN non salvato in chiaro', async () => {
    const [a, b] = await Promise.all([createPinRecord('1234'), createPinRecord('1234')]);
    expect(a.salt).not.toBe(b.salt);
    expect(JSON.stringify(a)).not.toContain('1234');
  });
  it('accetta solo 4-8 cifre', () => {
    expect(PIN_PATTERN.test('1234')).toBe(true);
    expect(PIN_PATTERN.test('123')).toBe(false);
    expect(PIN_PATTERN.test('12a4')).toBe(false);
  });
  it('rallenta dopo 5 tentativi sbagliati', () => {
    expect(lockoutSeconds(4)).toBe(0);
    expect(lockoutSeconds(5)).toBe(15);
    expect(lockoutSeconds(6)).toBe(30);
    expect(lockoutSeconds(20)).toBe(300);
  });
});
