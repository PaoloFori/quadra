/** Schede dei Resoconti che si possono personalizzare. */
export type ReportView = 'month' | 'year' | 'wealth';

/** Ordine dei blocchi e blocchi nascosti di una vista; salvato nelle impostazioni (quindi nei backup). */
export interface ReportLayout {
  order: string[];
  hidden: string[];
}
export type ReportLayouts = Partial<Record<ReportView, ReportLayout>>;

/**
 * Applica la personalizzazione ai blocchi disponibili: prima quelli ordinati dall'utente (se esistono ancora),
 * poi quelli nuovi nella loro posizione di default. Un id sconosciuto salvato in passato viene ignorato.
 */
export function orderBlocks(
  available: readonly string[],
  layout: ReportLayout | undefined,
): { id: string; hidden: boolean }[] {
  const hidden = new Set(layout?.hidden ?? []);
  const known = new Set(available);
  const ordered = [
    ...(layout?.order ?? []).filter((id, i, all) => known.has(id) && all.indexOf(id) === i),
    ...available,
  ].filter((id, i, all) => all.indexOf(id) === i);
  return ordered.map((id) => ({ id, hidden: hidden.has(id) }));
}

/** Sposta il blocco `id` di una posizione (−1 su, +1 giù) restituendo il nuovo ordine completo. */
export function moveBlock(order: readonly string[], id: string, delta: -1 | 1): string[] {
  const i = order.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** Valida ciò che arriva da un backup o dal database: scarta tutto ciò che non ha la forma attesa. */
export function sanitizeLayouts(raw: unknown): ReportLayouts {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: ReportLayouts = {};
  for (const view of ['month', 'year', 'wealth'] as const) {
    const v = (raw as Record<string, unknown>)[view];
    if (typeof v !== 'object' || v === null) continue;
    const { order, hidden } = v as Record<string, unknown>;
    const strings = (x: unknown): string[] =>
      Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [];
    out[view] = { order: strings(order), hidden: strings(hidden) };
  }
  return out;
}
