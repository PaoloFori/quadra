import { useTranslation } from 'react-i18next';
import { NavRow } from '@/components/NavRow';
import { Screen } from '@/components/Screen';
import { BackupReminder } from '@/features/backup/BackupReminder';
import { LanguageSetting } from './LanguageSetting';
import { ThemeSetting } from './ThemeSetting';

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('settings.title')}>
      <BackupReminder />
      <h2 className="section-title">{t('settings.appearance')}</h2>
      <ThemeSetting />
      <LanguageSetting />
      <h2 className="section-title">{t('settings.dataSection')}</h2>
      <div className="card !p-2">
        <NavRow icon="💾" to="/settings/backup" label={t('backup.title')} />
        <NavRow icon="🔒" to="/settings/security" label={t('security.title')} />
        <NavRow icon="🏦" to="/settings/accounts" label={t('accounts.title')} />
        <NavRow icon="🏷️" to="/settings/categories" label={t('categories.title')} />
        <NavRow icon="⚙️" to="/settings/rules" label={t('rules.title')} />
        <NavRow icon="📥" to="/import" label={t('import.title')} />
      </div>
    </Screen>
  );
}
