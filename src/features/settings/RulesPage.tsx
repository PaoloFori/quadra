import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useCategoryLookup } from '@/db/hooks';
import { newId, rulesRepo } from '@/db/repositories';
import { normalizeText } from '@/lib/normalize';

function AddRuleSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const lookup = useCategoryLookup();
  const [pattern, setPattern] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const chosen = categoryId || lookup.all[0]?.id || '';

  async function save(): Promise<void> {
    const normalized = normalizeText(pattern);
    if (!normalized || !chosen) return;
    await rulesRepo.put({ id: newId(), pattern: normalized, categoryId: chosen, origin: 'user' });
    onClose();
  }

  return (
    <Sheet title={t('rules.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="r-pattern">
          {t('rules.contains')}
        </label>
        <input
          id="r-pattern"
          className="input"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="r-cat">
          {t('common.category')}
        </label>
        <select
          id="r-cat"
          className="input"
          value={chosen}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {lookup.all.map((c) => (
            <option key={c.id} value={c.id}>
              {lookup.label(c.id)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn-primary w-full" disabled={!pattern.trim()} onClick={() => void save()}>
        {t('common.save')}
      </button>
    </Sheet>
  );
}

export default function RulesPage() {
  const { t } = useTranslation();
  const rules = useLiveQuery(rulesRepo.all, [], []);
  const lookup = useCategoryLookup();
  const [adding, setAdding] = useState(false);
  const sorted = [...rules].sort((a, b) => a.pattern.localeCompare(b.pattern));

  return (
    <Screen
      title={t('rules.title')}
      action={
        <button className="btn-primary" onClick={() => setAdding(true)}>
          {t('rules.add')}
        </button>
      }
    >
      <Link to="/settings" className="mb-2 inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      <p className="mb-3 px-1 text-[13px] text-muted">{t('rules.intro')}</p>
      <ul className="card !p-2">
        {sorted.map((r) => (
          <li
            key={r.id}
            className="flex min-h-[48px] items-center gap-3 border-b border-line/60 px-1 last:border-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">“{r.pattern}”</span>
              <span className="block truncate text-[13px] text-muted">
                → {lookup.label(r.categoryId)}
                {r.origin === 'learned' ? ` · ${t('rules.learned')}` : ''}
              </span>
            </span>
            <button
              className="btn-secondary !px-3"
              aria-label={t('common.delete')}
              onClick={() => void rulesRepo.remove(r.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {adding && <AddRuleSheet onClose={() => setAdding(false)} />}
    </Screen>
  );
}
