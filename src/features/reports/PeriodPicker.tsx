import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { useFormat } from '@/i18n/useFormat';

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

/** Scelta del periodo da una griglia: i mesi di un anno (con le frecce per cambiare anno) o l'elenco degli anni. */
export function PeriodPicker({
  mode,
  value,
  firstYear,
  onPick,
  onClose,
}: {
  mode: 'month' | 'year';
  /** `YYYY-MM` per i mesi, `YYYY` per gli anni. */
  value: string;
  /** Primo anno con movimenti (se non ce ne sono, solo gli ultimi anni). */
  firstYear?: number;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const first = Math.min(firstYear ?? thisYear - 4, thisYear);
  const years = Array.from({ length: thisYear - first + 1 }, (_, i) => first + i);
  const cell = (selected: boolean): string =>
    `chip justify-center !px-1 ${selected ? 'chip-on' : ''}`;

  return (
    <Sheet title={t(mode === 'month' ? 'reports.pickMonth' : 'reports.pickYear')} onClose={onClose}>
      {mode === 'month' ? (
        <>
          <div className="flex items-center justify-between">
            <button
              className="btn-secondary !min-w-[44px] !px-3"
              aria-label={t('reports.previous')}
              onClick={() => setYear(year - 1)}
            >
              ‹
            </button>
            <p className="font-display text-[20px] font-medium">{year}</p>
            <button
              className="btn-secondary !min-w-[44px] !px-3"
              aria-label={t('reports.next')}
              onClick={() => setYear(year + 1)}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m) => (
              <button
                key={m}
                className={`${cell(value === `${year}-${m}`)} capitalize`}
                aria-pressed={value === `${year}-${m}`}
                onClick={() => onPick(`${year}-${m}`)}
              >
                {f.monthShort(`${year}-${m}`)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {years.map((y) => (
            <button
              key={y}
              className={cell(value === String(y))}
              aria-pressed={value === String(y)}
              onClick={() => onPick(String(y))}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
