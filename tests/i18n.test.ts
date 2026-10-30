import { describe, expect, it } from 'vitest';
import it_ from '@/i18n/locales/it.json';
import en from '@/i18n/locales/en.json';
import { resolveLanguage } from '@/i18n';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

const placeholders = (s: string): string[] => (s.match(/{{\s*\w+\s*}}/g) ?? []).sort();

describe('traduzioni', () => {
  const itFlat = flatten(it_ as Tree);
  const enFlat = flatten(en as Tree);

  it('hanno le stesse chiavi', () => {
    const missingInEn = Object.keys(itFlat).filter((k) => !(k in enFlat));
    const missingInIt = Object.keys(enFlat).filter((k) => !(k in itFlat));
    expect({ missingInEn, missingInIt }).toEqual({ missingInEn: [], missingInIt: [] });
  });

  it('non hanno valori vuoti e usano gli stessi segnaposto', () => {
    for (const [key, value] of Object.entries(itFlat)) {
      expect(value.trim(), key).not.toBe('');
      expect(placeholders(enFlat[key] ?? ''), key).toEqual(placeholders(value));
    }
  });
});

describe('resolveLanguage', () => {
  it('rispetta la scelta esplicita', () => {
    expect(resolveLanguage('en', ['it-IT'])).toBe('en');
  });
  it('segue la lingua del telefono', () => {
    expect(resolveLanguage('auto', ['en-GB', 'it'])).toBe('en');
  });
  it('ripiega sull’italiano', () => {
    expect(resolveLanguage('auto', ['fr-FR'])).toBe('it');
  });
});
