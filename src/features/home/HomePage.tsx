import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('home.title')}>
      <p className="card text-muted">{t('home.empty')}</p>
    </Screen>
  );
}
