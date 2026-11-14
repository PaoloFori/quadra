import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oneOf, readStored, writeStored } from '@/lib/persistentState';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("ultimo utilizzo ricordato sul dispositivo", () => {
  beforeEach(() => void vi.stubGlobal('localStorage', fakeStorage()));
  afterEach(() => void vi.unstubAllGlobals());

  it('salva e rilegge un valore', () => {
    writeStored('reports.mode', 'movements');
    expect(readStored('reports.mode', oneOf(['month', 'year', 'movements']))).toBe('movements');
  });

  it('scarta valori che non hanno la forma attesa', () => {
    writeStored('reports.mode', 'inesistente');
    expect(readStored('reports.mode', oneOf(['month', 'year']))).toBeUndefined();
    localStorage.setItem('quadra:ui:rotto', '{non json');
    expect(readStored('rotto', oneOf(['a']))).toBeUndefined();
    expect(readStored('mai-salvato', oneOf(['a']))).toBeUndefined();
  });

  it('non rompe nulla se la memoria del browser non è disponibile', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloccato');
      },
      setItem: () => {
        throw new Error('bloccato');
      },
    });
    expect(() => writeStored('x', 1)).not.toThrow();
    expect(readStored('x', oneOf([1]))).toBeUndefined();
  });

  it('i numeri ammessi (6, 12, 24, 0) si riconoscono', () => {
    writeStored('month.span', 24);
    expect(readStored('month.span', oneOf([6, 12, 24, 0]))).toBe(24);
    writeStored('month.span', 7);
    expect(readStored('month.span', oneOf([6, 12, 24, 0]))).toBeUndefined();
  });
});
