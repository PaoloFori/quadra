import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> & {
  /** Consente il segno meno davanti (saldi che possono essere in rosso). */
  signed?: boolean;
};

/**
 * Campo per gli importi: su telefono apre il tastierino numerico con la virgola (non quello con le lettere),
 * il tasto invio lo chiude, e le lettere non entrano nemmeno se incollate o scritte da tastiera.
 */
export function AmountInput({ signed = false, onChange, onKeyDown, ...rest }: Props) {
  const allowed = signed ? /[^0-9.,-]/g : /[^0-9.,]/g;
  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      pattern={signed ? '-?[0-9]*[.,]?[0-9]*' : '[0-9]*[.,]?[0-9]*'}
      {...rest}
      onChange={(e) => {
        const clean = e.target.value.replace(allowed, '');
        if (clean !== e.target.value) e.target.value = clean;
        onChange?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        onKeyDown?.(e);
      }}
    />
  );
}
