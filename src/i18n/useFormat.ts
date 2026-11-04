import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createFormatters, type Formatters } from '@/lib/format';
import { useAmountsHidden } from '@/lib/privacy';

const MASK = '•••••';

export function useFormat(): Formatters {
  const { i18n } = useTranslation();
  const hidden = useAmountsHidden();
  return useMemo(() => {
    const base = createFormatters(i18n.language);
    return hidden ? { ...base, currency: () => MASK, currencySigned: () => MASK } : base;
  }, [i18n.language, hidden]);
}
