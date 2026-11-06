import { useTranslation } from 'react-i18next';
import type { Category } from '@/domain/types';
import type { CategoryLookup } from '@/db/hooks';

interface Props {
  lookup: CategoryLookup;
  value: string | null;
  onChange: (id: string | null) => void;
  /** Mostra solo le categorie adatte a uscite/entrate. */
  kind?: 'expense' | 'income';
  /** Se presente, in fondo compare la tessera «Nuova» che lo richiama. */
  onAdd?: () => void;
}

const fits = (c: Category, kind?: 'expense' | 'income'): boolean =>
  !kind || c.kind === 'both' || c.kind === kind;

/** Griglia di categorie selezionabili con un tap. */
export function CategoryPicker({ lookup, value, onChange, kind, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('common.category')} className="grid grid-cols-3 gap-2">
      {lookup.all
        .filter((c) => fits(c, kind) || c.id === value)
        .map((c) => {
          const selected = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : c.id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] px-1 py-2 text-center text-[12px] leading-tight ${
                selected
                  ? 'border-black bg-accent font-semibold text-on-accent'
                  : 'border-line bg-card'
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {c.icon}
              </span>
              <span className="line-clamp-2 break-words">{lookup.label(c.id)}</span>
            </button>
          );
        })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-line-strong px-1 py-2 text-center text-[12px] leading-tight text-muted"
        >
          <span aria-hidden="true" className="text-xl">
            ＋
          </span>
          <span>{t('categories.newShort')}</span>
        </button>
      )}
    </div>
  );
}
