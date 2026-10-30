import { useFormat } from '@/i18n/useFormat';

interface Props {
  cents: number;
  neutral?: boolean;
  signed?: boolean;
  className?: string;
}

/** Importo con cifre tabulari: entrate «+» in verde-lime, uscite «−» nel colore del testo (il rosso è solo per gli indicatori). */
export function Amount({ cents, neutral = false, signed = true, className = '' }: Props) {
  const f = useFormat();
  const color = neutral || cents <= 0 ? 'text-ink' : 'text-income';
  return (
    <span className={`tabular font-display whitespace-nowrap ${color} ${className}`}>
      {signed ? f.currencySigned(cents) : f.currency(cents)}
    </span>
  );
}
