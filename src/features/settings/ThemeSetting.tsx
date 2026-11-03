import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { getSettings, setSetting } from '@/db/settings';
import { applyTheme, DEFAULT_THEME, isThemeId, THEMES, type ThemeId } from '@/lib/themes';

/** Scelta del tema: ogni anteprima è un mini-schermo che usa i colori del tema stesso. */
export function ThemeSetting() {
  const { t } = useTranslation();
  const settings = useLiveQuery(getSettings, []);
  const [open, setOpen] = useState(false);
  const current: ThemeId = isThemeId(settings?.theme) ? settings.theme : DEFAULT_THEME;

  async function choose(id: ThemeId): Promise<void> {
    applyTheme(id);
    await setSetting('theme', id);
    setOpen(false);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <span
          data-theme={current}
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg ring-1 ring-line-strong"
        >
          <span className="h-4 w-4 rounded-full bg-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label !mb-0">{t('settings.currentTheme')}</p>
          <p className="truncate font-medium">{t(`themes.${current}`)}</p>
        </div>
        <button
          className="btn-secondary !min-h-[40px] !px-3 !text-[14px]"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? t('settings.closeThemes') : t('settings.changeTheme')}
        </button>
      </div>
      {open && (
        <div role="radiogroup" aria-label={t('settings.theme')} className="grid grid-cols-2 gap-3">
          {THEMES.map(({ id }) => {
            const selected = id === current;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={selected}
                onClick={() => void choose(id)}
                className={`rounded-2xl border-2 p-1.5 text-left transition ${selected ? 'border-ink' : 'border-line'}`}
              >
                <span
                  data-theme={id}
                  aria-hidden="true"
                  className="block space-y-1.5 rounded-xl bg-bg p-2.5"
                >
                  <span className="block h-2 w-10 rounded-full bg-accent" />
                  <span className="flex gap-1.5">
                    <span className="h-6 flex-1 rounded-md bg-card ring-1 ring-line" />
                    <span className="h-6 w-6 rounded-md bg-accent" />
                  </span>
                  <span className="block h-1.5 w-16 rounded-full bg-tile" />
                </span>
                <span className="mt-1.5 flex items-center justify-between px-1 text-[13px] font-medium">
                  {t(`themes.${id}`)}
                  {selected && <span aria-hidden="true">✓</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
