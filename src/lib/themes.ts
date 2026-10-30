/** Temi disponibili: i colori stanno in index.css (`[data-theme='…']`), qui solo l'elenco. */
export const THEMES = [
  { id: 'blu', dark: true },
  { id: 'lime', dark: true },
  { id: 'navy', dark: true },
  { id: 'plum', dark: true },
  { id: 'forest', dark: true },
  { id: 'amber', dark: true },
  { id: 'violet', dark: true },
  { id: 'mono', dark: true },
  { id: 'light-blue', dark: false },
  { id: 'light-pink', dark: false },
  { id: 'light-green', dark: false },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'blu';
export const THEME_STORAGE_KEY = 'quadra:theme';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** Applica il tema: attributo su <html>, barra di stato del browser dello stesso colore dello sfondo, copia locale per l'avvio senza lampi. */
export function applyTheme(id: string | undefined): ThemeId {
  const theme = isThemeId(id) ? id : DEFAULT_THEME;
  const root = document.documentElement;
  root.dataset.theme = theme;
  const [r, g, b] = getComputedStyle(root).getPropertyValue('--bg').trim().split(/\s+/);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', r && g && b ? `rgb(${r}, ${g}, ${b})` : '#0a0c0b');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* solo una comodità per l'avvio */
  }
  return theme;
}
