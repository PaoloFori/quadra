import { useFormat } from '@/i18n/useFormat';

interface Props {
  cents: number;
  neutral?: boolean;
  signed?: boolean;
  className?: string;
}

/** Importo con cifre tabulari: uscite in rosso, entrate in verde. */
export function Amount({ cents, neutral = false, signed = true, className = '' }: Props) {
  const f = useFormat();
  const color = neutral || cents === 0 ? 'text-ink' : cents < 0 ? 'text-expense' : 'text-income';
  return (
    <span className={`tabular whitespace-nowrap ${color} ${className}`}>
      {signed ? f.currencySigned(cents) : f.currency(cents)}
    </span>
  );
}
