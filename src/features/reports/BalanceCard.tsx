import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { SectionTitle } from '@/components/ui';
import { WealthChart } from '@/components/WealthChart';
import type { MonthBalance } from '@/domain/reports/balance';
import { useFormat } from '@/i18n/useFormat';

interface Props {
  title: string;
  startLabel: string;
  endLabel: string;
  /** Mesi da mostrare nel grafico, in ordine; il saldo di inizio/fine è quello del primo/ultimo. */
  balances: MonthBalance[];
  /** Vero per il periodo in corso: il saldo finale è quello di oggi. */
  partialNote?: string;
  /** Mesi con almeno 2 punti disegnano la linea; con meno non si mostra il grafico. */
  showChart?: boolean;
  /** Saldo di inizio/fine del periodo mostrato, se diverso da quello del primo/ultimo mese del grafico. */
  startCents?: number;
  endCents?: number;
}

/** Saldo del conto all'inizio e alla fine del periodo, la variazione e come è cambiato mese dopo mese. */
export function BalanceCard({
  title,
  startLabel,
  endLabel,
  balances,
  partialNote,
  showChart = true,
  startCents,
  endCents,
}: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const first = balances[0];
  const last = balances[balances.length - 1];
  if (!first || !last) return null;
  const start = startCents ?? first.startCents;
  const end = endCents ?? last.endCents;
  const change = end - start;

  return (
    <section className="card space-y-3" aria-label={title}>
      <SectionTitle title={title} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="label-caps">{startLabel}</p>
          <Amount cents={start} neutral signed={false} className="text-[20px]" />
        </div>
        <div>
          <p className="label-caps">{endLabel}</p>
          <Amount cents={end} neutral signed={false} className="text-[20px]" />
        </div>
      </div>
      <p className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="text-muted">{t('reports.balanceChange')}</span>
        <Amount cents={change} className="text-[16px]" />
      </p>
      {partialNote && <p className="text-[13px] text-muted">{partialNote}</p>}
      {showChart && balances.length >= 2 && (
        <WealthChart
          values={balances.map((b) => b.endCents)}
          labels={balances.map((b) => f.monthShort(b.month))}
          label={title}
        />
      )}
      <p className="text-[12px] text-faint">{t('reports.balanceHint')}</p>
    </section>
  );
}
