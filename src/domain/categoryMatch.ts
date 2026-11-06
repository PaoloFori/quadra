import { normalizeText } from '@/lib/normalize';
import type { Category } from './types';

/**
 * Categoria che ha già questo nome (senza badare a maiuscole, accenti e spazi doppi), se c'è.
 * `label` è il nome mostrato (le predefinite hanno il nome nella traduzione).
 */
export function findCategoryByName(
  categories: readonly Category[],
  label: (id: string) => string,
  name: string,
): Category | undefined {
  const wanted = normalizeText(name);
  if (wanted === '') return undefined;
  return categories.find((c) => normalizeText(label(c.id)) === wanted);
}

/** Primo colore della palette non ancora usato; se sono tutti usati, riparte dall'inizio. */
export function nextCategoryColor(used: readonly string[], palette: readonly string[]): string {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  return palette.find((c) => !taken.has(c.toLowerCase())) ?? palette[used.length % palette.length]!;
}
