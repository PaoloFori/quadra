import { useTranslation } from 'react-i18next';
import { NavRow } from '@/components/NavRow';
import { Screen } from '@/components/Screen';
import { LanguageSetting } from './LanguageSetting';

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('settings.title')}>
      <h2 className="section-title">{t('settings.appearance')}</h2>
      <LanguageSetting />
      <h2 className="section-title">{t('settings.dataSection')}</h2>
      <div className="card !p-2">
        <NavRow to="/settings/accounts" label={t('accounts.title')} />
        <NavRow to="/settings/categories" label={t('categories.title')} />
        <NavRow to="/settings/rules" label={t('rules.title')} />
        <NavRow to="/import" label={t('import.title')} />
      </div>
    </Screen>
  );
}
