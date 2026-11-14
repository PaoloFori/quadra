import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { SectionTitle } from '@/components/ui';

interface Props {
  title: string;
  startLabel: string;
  endLabel: string;
  /** Saldo del conto all'inizio e alla fine del periodo mostrato. */
  startCents: number;
  endCents: number;
  /** Per il periodo in corso: spiega che il saldo finale è quello di oggi. */
  partialNote?: string;
  /** Grafico dell'andamento del periodo (giornaliero nel mese, annuale nell'anno). */
  chart?: ReactNode;
}

/** Saldo del conto all'inizio e alla fine del periodo, la variazione e l'andamento del periodo. */
export function BalanceCard({
  title,
  startLabel,
  endLabel,
  startCents,
  endCents,
  partialNote,
  chart,
}: Props) {
  const { t } = useTranslation();
  const change = endCents - startCents;

  return (
    <section className="card space-y-3" aria-label={title}>
      <SectionTitle title={title} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="label-caps">{startLabel}</p>
          <Amount cents={startCents} neutral signed={false} className="text-[20px]" />
        </div>
        <div>
          <p className="label-caps">{endLabel}</p>
          <Amount cents={endCents} neutral signed={false} className="text-[20px]" />
        </div>
      </div>
      <p className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="text-muted">{t('reports.balanceChange')}</span>
        <Amount cents={change} className="text-[16px]" />
      </p>
      {partialNote && <p className="text-[13px] text-muted">{partialNote}</p>}
      {chart}
      <p className="text-[12px] text-faint">{t('reports.balanceHint')}</p>
    </section>
  );
}
