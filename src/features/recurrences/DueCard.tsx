import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { IconTile, SectionTitle } from '@/components/ui';
import { useCategoryLookup } from '@/db/hooks';
import { recurrencesRepo } from '@/db/repositories';
import { dueNow, upcoming, type DueItem } from '@/domain/recurrence';
import { useFormat } from '@/i18n/useFormat';
import { diffDays, todayIso } from '@/lib/dates';
import { DueSheet } from './DueSheet';

const MAX_ROWS = 4;

/** Scadenze in Home: quelle da registrare ora e quelle dei prossimi 7 giorni. */
export function DueCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const recs = useLiveQuery(recurrencesRepo.all, []);
  const [open, setOpen] = useState<DueItem | null>(null);
  const today = todayIso();

  const { due, soon } = useMemo(
    () => ({ due: dueNow(recs ?? [], today), soon: upcoming(recs ?? [], today) }),
    [recs, today],
  );
  if (due.length === 0 && soon.length === 0) return null;

  const row = (item: DueItem, action: boolean) => {
    const { recurrence: r, dueDate } = item;
    const days = diffDays(today, dueDate);
    const when =
      days < 0
        ? t('recurrence.dueOverdue', { date: f.date(dueDate) })
        : days === 0
          ? t('recurrence.dueToday')
          : t('recurrence.dueIn', { count: days });
    return (
      <li key={`${r.id}${dueDate}`} className="border-t border-line py-2.5 first:border-0">
        <div className="flex items-center gap-3">
          <IconTile>{(r.categoryId && lookup.byId.get(r.categoryId)?.icon) || '🔁'}</IconTile>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 font-medium">{r.title}</span>
            <span className={`text-[13px] ${days < 0 ? 'text-expense' : 'text-muted'}`}>
              {when}
            </span>
          </span>
          <Amount cents={r.amountCents} className="text-[16px]" />
        </div>
        {action && (
          <button
            className="btn-primary mt-2 w-full !min-h-[40px] !text-[14px]"
            onClick={() => setOpen(item)}
          >
            {t('recurrence.register')}
          </button>
        )}
      </li>
    );
  };

  return (
    <>
      <section className="card space-y-1" aria-label={t('recurrence.dueTitle')}>
        <SectionTitle
          title={t('recurrence.dueTitle')}
          trailing={
            <Link to="/settings/recurrences" className="text-[14px] text-accent">
              {t('recurrence.manage')}
            </Link>
          }
        />
        {due.length > 0 && (
          <div className="pt-2">
            <p className="label-caps pb-1">{t('recurrence.dueNow')}</p>
            <ul>{due.slice(0, MAX_ROWS).map((d) => row(d, true))}</ul>
            {due.length > MAX_ROWS && (
              <p className="pt-1 text-[13px] text-muted">
                {t('recurrence.moreDue', { count: due.length - MAX_ROWS })}
              </p>
            )}
          </div>
        )}
        {soon.length > 0 && (
          <div className="pt-2">
            <p className="label-caps pb-1">{t('recurrence.upcoming')}</p>
            <ul>{soon.map((d) => row(d, false))}</ul>
          </div>
        )}
      </section>
      {open && (
        <DueSheet
          recurrence={open.recurrence}
          dueDate={open.dueDate}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
