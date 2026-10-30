import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function BudgetPage() {
  const { t } = useTranslation();
  return <Screen title={t('nav.budget')}>{null}</Screen>;
}
