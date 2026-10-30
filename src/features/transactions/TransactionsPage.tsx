import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';

export default function TransactionsPage() {
  const { t } = useTranslation();
  return <Screen title={t('nav.transactions')}>{null}</Screen>;
}
