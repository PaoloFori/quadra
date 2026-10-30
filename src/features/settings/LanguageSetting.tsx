import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, setSetting } from '@/db/settings';
import { applyLanguage } from '@/i18n';
import type { LanguagePref } from '@/domain/types';

const OPTIONS: Array<{ value: LanguagePref; key: string }> = [
  { value: 'auto', key: 'settings.languageAuto' },
  { value: 'it', key: 'settings.languageIt' },
  { value: 'en', key: 'settings.languageEn' },
];

export function LanguageSetting() {
  const { t } = useTranslation();
  const settings = useLiveQuery(getSettings, []);

  async function change(value: LanguagePref): Promise<void> {
    await setSetting('language', value);
    await applyLanguage(value);
  }

  return (
    <div className="card">
      <label className="label" htmlFor="language">
        {t('settings.language')}
      </label>
      <select
        id="language"
        className="input"
        value={settings?.language ?? 'auto'}
        onChange={(e) => void change(e.target.value as LanguagePref)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.key)}
          </option>
        ))}
      </select>
    </div>
  );
}
