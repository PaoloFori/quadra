import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './locales/it.json';
import en from './locales/en.json';
import type { LanguagePref } from '@/domain/types';

/** Per aggiungere una lingua: nuovo JSON in locales/ e una riga qui. */
export const LANGUAGES = { it: { translation: it }, en: { translation: en } } as const;
export type SupportedLanguage = keyof typeof LANGUAGES;
export const FALLBACK_LANGUAGE: SupportedLanguage = 'it';

export function isSupported(code: string): code is SupportedLanguage {
  return code in LANGUAGES;
}

/** Lingua effettiva: scelta esplicita → lingua del telefono → italiano. */
export function resolveLanguage(
  pref: LanguagePref,
  deviceLanguages: readonly string[] = navigator.languages ?? [navigator.language],
): SupportedLanguage {
  if (pref !== 'auto' && isSupported(pref)) return pref;
  for (const tag of deviceLanguages) {
    const base = tag.toLowerCase().split('-')[0] ?? '';
    if (isSupported(base)) return base;
  }
  return FALLBACK_LANGUAGE;
}

export async function initI18n(pref: LanguagePref): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: LANGUAGES,
    lng: resolveLanguage(pref),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  document.documentElement.lang = i18n.language;
}

export async function applyLanguage(pref: LanguagePref): Promise<void> {
  const lang = resolveLanguage(pref);
  await i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export { i18n };
