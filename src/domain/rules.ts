import { descriptionKey, normalizeText } from '@/lib/normalize';
import type { Rule } from './types';

/** Parole generiche degli estratti conto: poco utili per riconoscere un esercente. */
const NOISE = new Set([
  'pagamento',
  'pagamenti',
  'carta',
  'pos',
  'acquisto',
  'addebito',
  'accredito',
  'sepa',
  'bonifico',
  'a',
  'favore',
  'da',
  'di',
  'del',
  'la',
  'il',
  'srl',
  'spa',
  'su',
  'per',
  'con',
  'in',
  'visa',
  'mastercard',
  'debit',
  'circuito',
  'operazione',
  'conto',
  'eur',
  'italia',
  'it',
]);

/** Categoria della regola più specifica (pattern più lungo) che combacia; a parità vince quella dell'utente. */
export function matchCategory(description: string, rules: readonly Rule[]): string | null {
  const text = ` ${normalizeText(description)} `;
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!text.includes(rule.pattern)) continue;
    if (
      !best ||
      rule.pattern.trim().length > best.pattern.trim().length ||
      (rule.pattern.trim().length === best.pattern.trim().length &&
        rule.origin === 'user' &&
        best.origin === 'learned')
    ) {
      best = rule;
    }
  }
  return best?.categoryId ?? null;
}

/** Pattern appreso da una correzione: le prime due parole significative della descrizione. */
export function derivePattern(description: string): string | null {
  const words = descriptionKey(description)
    .split(' ')
    .filter((w) => w.length >= 3 && !NOISE.has(w));
  if (words.length === 0) return null;
  return words.slice(0, 2).join(' ');
}

/** Aggiorna (o crea) la regola appresa per il pattern; restituisce l'elenco di regole aggiornato. */
export function learnRule(
  rules: readonly Rule[],
  description: string,
  categoryId: string,
  newId: string,
): Rule[] {
  const pattern = derivePattern(description);
  if (!pattern) return [...rules];
  const existing = rules.find((r) => r.pattern === pattern);
  if (existing) return rules.map((r) => (r.id === existing.id ? { ...r, categoryId } : r));
  return [...rules, { id: newId, pattern, categoryId, origin: 'learned' }];
}
