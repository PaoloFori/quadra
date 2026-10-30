import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createFormatters, type Formatters } from '@/lib/format';

export function useFormat(): Formatters {
  const { i18n } = useTranslation();
  return useMemo(() => createFormatters(i18n.language), [i18n.language]);
}
