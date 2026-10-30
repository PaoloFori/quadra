import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function ReportsPage() {
  const { t } = useTranslation();
  return <Screen title={t('nav.reports')}>{null}</Screen>;
}
