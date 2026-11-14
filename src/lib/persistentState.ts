import { useCallback, useState } from 'react';

/**
 * Come è stata usata l'app l'ultima volta (scheda, conto scelto, filtri…).
 * Resta solo su questo dispositivo, in localStorage: non entra nei backup perché non sono dati.
 * Se la memoria del browser non è disponibile l'app funziona uguale, senza ricordare nulla.
 */
const PREFIX = 'quadra:ui:';

/** Legge un valore salvato; `parse` scarta tutto ciò che non ha la forma attesa (dati vecchi o alterati). */
export function readStored<T>(key: string, parse: (raw: unknown) => T | undefined): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* solo una comodità: se non si può salvare si ignora */
  }
}

/** `useState` che ricorda il valore tra una sessione e l'altra. `initial` vale la prima volta e se il valore salvato non è valido. */
export function usePersistentState<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | undefined,
): readonly [T, (value: T) => void] {
  const [value, set] = useState<T>(() => readStored(key, parse) ?? initial);
  const update = useCallback(
    (next: T) => {
      set(next);
      writeStored(key, next);
    },
    [key],
  );
  return [value, update] as const;
}

/** Valida che `raw` sia uno dei valori ammessi. */
export const oneOf =
  <T extends string | number>(allowed: readonly T[]) =>
  (raw: unknown): T | undefined =>
    allowed.find((a) => a === raw);
