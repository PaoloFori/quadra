import { useSyncExternalStore } from 'react';

/** Modalità privacy: nasconde tutti gli importi. Resta memorizzata sul dispositivo. */
const KEY = 'quadra.hideAmounts';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let hidden = read();

export function setAmountsHidden(value: boolean): void {
  hidden = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    /* ignora */
  }
  listeners.forEach((l) => l());
}

export function useAmountsHidden(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hidden,
  );
}
