import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Screen } from '@/components/Screen';
import { IconTile } from '@/components/ui';
import { useCategoryLookup } from '@/db/hooks';
import { recurrencesRepo } from '@/db/repositories';
import type { Recurrence } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { RecurrenceSheet } from './RecurrenceSheet';

export default function RecurrencesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const recs = useLiveQuery(recurrencesRepo.all, [], []);
  const [editing, setEditing] = useState<Recurrence | 'new' | null>(null);
  const sorted = useMemo(
    () =>
      [...recs].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.nextDue.localeCompare(b.nextDue),
      ),
    [recs],
  );

  return (
    <Screen
      title={t('recurrence.title')}
      action={
        <button
          className="btn-primary !min-h-[44px] !rounded-full"
          onClick={() => setEditing('new')}
        >
          + {t('home.newTx')}
        </button>
      }
    >
      <Link to="/settings" className="inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      <p className="px-1 text-[14px] text-muted">{t('recurrence.intro')}</p>
      {sorted.length === 0 ? (
        <p className="card text-muted">{t('recurrence.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.id}>
              <button
                className={`card-row flex w-full items-center gap-3 p-3.5 text-left ${r.active ? '' : 'opacity-60'}`}
                onClick={() => setEditing(r)}
              >
                <IconTile>{(r.categoryId && lookup.byId.get(r.categoryId)?.icon) || '🔁'}</IconTile>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-medium">
                    {r.title} {r.remind ? '🔔' : ''}
                  </span>
                  <span className="text-[13px] text-muted">
                    {t(`recurrence.freq.${r.frequency}`)} ·{' '}
                    {r.active
                      ? t('recurrence.nextShort', { date: f.date(r.nextDue) })
                      : t('recurrence.paused')}
                  </span>
                </span>
                <Amount cents={r.amountCents} className="text-[17px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <RecurrenceSheet
          recurrence={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
