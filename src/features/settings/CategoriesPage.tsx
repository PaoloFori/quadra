import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useCategoryLookup } from '@/db/hooks';
import { categoriesRepo, newId } from '@/db/repositories';
import type { Category, CategoryKind } from '@/domain/types';

const COLORS = [
  '#34c759',
  '#ff9500',
  '#5ac8fa',
  '#af52de',
  '#ffcc00',
  '#ff2d55',
  '#0a84ff',
  '#a2845e',
  '#636366',
  '#30d158',
];

function CategorySheet({ category, onClose }: { category?: Category; onClose: () => void }) {
  const { t } = useTranslation();
  const lookup = useCategoryLookup();
  const [name, setName] = useState(category ? lookup.label(category.id) : '');
  const [icon, setIcon] = useState(category?.icon ?? '🏷️');
  const [color, setColor] = useState(category?.color ?? COLORS[0]!);
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'expense');

  async function save(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Per le predefinite si salva il nome solo se diverso dalla traduzione, così il backup resta indipendente dalla lingua.
    const keepDefaultName =
      category?.builtin && trimmed === lookup.label(category.id) && category.name === undefined;
    await categoriesRepo.put({
      id: category?.id ?? newId(),
      builtin: category?.builtin ?? false,
      name: keepDefaultName ? undefined : trimmed,
      icon: icon.trim() || '🏷️',
      color,
      kind,
    });
    onClose();
  }

  async function remove(): Promise<void> {
    if (category && window.confirm(t('categories.confirmDelete'))) {
      await categoriesRepo.remove(category.id);
      onClose();
    }
  }

  return (
    <Sheet title={category ? t('common.edit') : t('categories.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="c-name">
          {t('categories.name')}
        </label>
        <input
          id="c-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="c-icon">
            {t('categories.icon')}
          </label>
          <input
            id="c-icon"
            className="input"
            value={icon}
            maxLength={4}
            onChange={(e) => setIcon(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="c-kind">
            {t('categories.kind')}
          </label>
          <select
            id="c-kind"
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
          >
            <option value="expense">{t('common.expenses')}</option>
            <option value="income">{t('common.income')}</option>
            <option value="both">{t('categories.both')}</option>
          </select>
        </div>
      </div>
      <div role="radiogroup" aria-label={t('categories.color')} className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={c === color}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`h-11 w-11 rounded-full border-2 ${c === color ? 'border-ink' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {category && !category.builtin && (
          <button className="btn-danger" onClick={() => void remove()}>
            {t('common.delete')}
          </button>
        )}
        <button className="btn-primary flex-1" onClick={() => void save()}>
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  );
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const lookup = useCategoryLookup();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  return (
    <Screen
      title={t('categories.title')}
      action={
        <button className="btn-primary" onClick={() => setEditing('new')}>
          {t('categories.add')}
        </button>
      }
    >
      <Link to="/settings" className="mb-2 inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      <ul className="card !p-2">
        {lookup.all.map((c) => (
          <li key={c.id} className="border-b border-line/60 last:border-0">
            <button
              className="flex min-h-[48px] w-full items-center gap-3 px-1"
              onClick={() => setEditing(c)}
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${c.color}33` }}
              >
                {c.icon}
              </span>
              <span className="flex-1 text-left">{lookup.label(c.id)}</span>
              <span className="text-[12px] text-muted">
                {c.kind === 'both'
                  ? t('categories.both')
                  : c.kind === 'income'
                    ? t('common.income')
                    : t('common.expenses')}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <CategorySheet
          category={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
