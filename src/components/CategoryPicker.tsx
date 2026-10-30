import { useTranslation } from 'react-i18next';
import type { Category } from '@/domain/types';
import type { CategoryLookup } from '@/db/hooks';

interface Props {
  lookup: CategoryLookup;
  value: string | null;
  onChange: (id: string | null) => void;
  /** Mostra solo le categorie adatte a uscite/entrate. */
  kind?: 'expense' | 'income';
}

const fits = (c: Category, kind?: 'expense' | 'income'): boolean =>
  !kind || c.kind === 'both' || c.kind === kind;

/** Griglia di categorie selezionabili con un tap. */
export function CategoryPicker({ lookup, value, onChange, kind }: Props) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('common.category')} className="grid grid-cols-3 gap-2">
      {lookup.all
        .filter((c) => fits(c, kind))
        .map((c) => {
          const selected = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : c.id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[12px] leading-tight ${
                selected ? 'border-accent bg-accent/15 font-semibold' : 'border-line bg-card'
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {c.icon}
              </span>
              <span className="line-clamp-2 break-words">{lookup.label(c.id)}</span>
            </button>
          );
        })}
    </div>
  );
}
