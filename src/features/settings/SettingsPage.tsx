import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { LanguageSetting } from './LanguageSetting';

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('settings.title')}>
      <h2 className="section-title">{t('settings.appearance')}</h2>
      <LanguageSetting />
    </Screen>
  );
}
