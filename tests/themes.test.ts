import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import it_ from '@/i18n/locales/it.json';
import { DEFAULT_THEME, isThemeId, THEMES } from '@/lib/themes';

const css = readFileSync('src/index.css', 'utf8');
const TOKENS = [
  'bg',
  'card',
  'raised',
  'tile',
  'ink',
  'muted',
  'faint',
  'line',
  'line-strong',
  'accent',
  'accent-subtle',
  'on-accent',
  'income',
  'expense',
  'negative-subtle',
  'warn',
];

/** Corpo del blocco CSS di un tema. */
function block(id: string): string {
  const start = css.indexOf(`[data-theme='${id}']`);
  expect(start, `manca il blocco CSS del tema ${id}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

describe('temi', () => {
  it('il tema predefinito esiste', () => {
    expect(isThemeId(DEFAULT_THEME)).toBe(true);
    expect(isThemeId('inesistente')).toBe(false);
  });

  it.each(THEMES.map((t) => t.id))('%s: definisce tutti i colori e ha un nome tradotto', (id) => {
    const body = block(id);
    for (const token of TOKENS) expect(body, `${id}: --${token}`).toContain(`--${token}:`);
    expect(body).toContain(
      `color-scheme: ${THEMES.find((t) => t.id === id)?.dark ? 'dark' : 'light'}`,
    );
    expect((it_.themes as Record<string, string>)[id]).toBeTruthy();
  });
});
