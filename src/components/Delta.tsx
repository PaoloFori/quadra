import { useTranslation } from 'react-i18next';
import { useFormat } from '@/i18n/useFormat';

interface Props {
  diff: number;
  pct: number | null;
  /** Per le uscite un aumento è negativo; per le entrate è positivo. */
  higherIsBad?: boolean;
}

export function Delta({ diff, pct, higherIsBad = true }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  if (diff === 0) return <span className="text-muted">{t('reports.same')}</span>;
  const bad = higherIsBad ? diff > 0 : diff < 0;
  return (
    <span className={`tabular ${bad ? 'text-expense' : 'text-income'}`}>
      {diff > 0 ? '▲' : '▼'} {f.currency(Math.abs(diff))}
      {pct !== null && ` (${f.percent(pct)})`}
    </span>
  );
}
