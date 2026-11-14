import { useCallback, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS } from '@/domain/reports/accounts';
import { renderPdf } from '@/domain/export/pdf';
import type { MonthReport } from '@/domain/reports/month';
import type { YearReport } from '@/domain/reports/year';
import { monthOf, shiftMonth, todayIso } from '@/lib/dates';
import { saveFile } from '@/lib/files';
import { oneOf, usePersistentState } from '@/lib/persistentState';
import { useFormat } from '@/i18n/useFormat';
import { filterFromParams } from '@/features/transactions/movementsLink';
import { MovementsPanel } from '@/features/transactions/MovementsPanel';
import { MonthView } from './MonthView';
import { monthPdfDoc, yearPdfDoc } from './pdfDocs';
import { WealthView } from './WealthView';
import { YearView } from './YearView';
import { PeriodPicker } from './PeriodPicker';
import { AccountChips } from './shared';

export type ReportsMode = 'month' | 'year' | 'wealth' | 'movements';
/** Schede visibili; i movimenti filtrati si aprono dai grafici e dai blocchi (route /transactions), non hanno più una scheda. */
const MODES: ReportsMode[] = ['month', 'year', 'wealth'];
const MODE_LABEL: Record<ReportsMode, string> = {
  month: 'reports.monthly',
  year: 'reports.yearly',
  wealth: 'wealth.tab',
  movements: 'nav.transactions',
};

export default function ReportsPage({ initialMode }: { initialMode?: ReportsMode }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const accounts = useAccounts();
  // conto e scheda scelti l'ultima volta restano memorizzati sul dispositivo
  const [accountId, setAccountId] = usePersistentState<string>(
    'reports.account',
    ALL_ACCOUNTS,
    (raw) => (typeof raw === 'string' ? raw : undefined),
  );
  // se il conto scelto viene eliminato si torna a «tutti»
  const scope =
    accountId === ALL_ACCOUNTS || accounts.some((a) => a.id === accountId)
      ? accountId
      : ALL_ACCOUNTS;
  const [storedMode, setMode] = usePersistentState<ReportsMode>(
    'reports.mode',
    'month',
    oneOf(MODES),
  );
  // aprendo /transactions si va ai movimenti; altrimenti si riparte dall'ultima scheda usata
  const [forced, setForced] = useState(initialMode);
  const mode = forced ?? storedMode;
  const chooseMode = (m: ReportsMode): void => {
    setForced(undefined);
    setMode(m);
  };
  // i filtri dei movimenti arrivano dall'indirizzo (link da grafici e schede); si riparte quando cambiano
  const [params] = useSearchParams();
  const [month, setMonth] = useState(monthOf(todayIso()));
  const [year, setYear] = useState(todayIso().slice(0, 4));
  const monthReport = useRef<MonthReport | undefined>(undefined);
  const yearReport = useRef<YearReport | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const firstDate = useLiveQuery(transactionsRepo.firstDate, []);

  const step = (delta: number): void => {
    if (mode === 'month') setMonth((m) => shiftMonth(m, delta));
    else setYear((y) => String(Number(y) + delta));
  };

  const setMonthReport = useCallback(
    (r: MonthReport | undefined) => void (monthReport.current = r),
    [],
  );
  const setYearReport = useCallback(
    (r: YearReport | undefined) => void (yearReport.current = r),
    [],
  );

  async function exportPdf(): Promise<void> {
    const ctx = {
      t,
      f,
      label: lookup.label,
      color: (id: string | null) => (id && lookup.byId.get(id)?.color) || '#98989d',
    };
    const doc =
      mode === 'month'
        ? monthReport.current && monthPdfDoc(monthReport.current, ctx)
        : yearReport.current && yearPdfDoc(yearReport.current, ctx);
    if (!doc) return;
    setExporting(true);
    try {
      await saveFile(
        await renderPdf(doc),
        `quadra-${mode === 'month' ? month : year}${scope === ALL_ACCOUNTS ? '' : `-${accounts.find((a) => a.id === scope)?.name ?? ''}`}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  }

  const title = mode === 'month' ? f.month(month) : year;

  return (
    <Screen
      title={t('nav.reports')}
      subtitle={mode === 'month' ? f.month(month) : mode === 'year' ? year : t(MODE_LABEL[mode])}
      action={
        mode === 'wealth' || mode === 'movements' ? undefined : (
          <button className="btn-secondary" disabled={exporting} onClick={() => void exportPdf()}>
            PDF
          </button>
        )
      }
    >
      <div
        role="group"
        aria-label={t('nav.reports')}
        className="grid grid-cols-3 gap-1.5 md:max-w-lg"
      >
        {MODES.map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => chooseMode(m)}
            className={`chip justify-center !px-1 !text-[13px] ${mode === m ? 'chip-on' : ''}`}
          >
            {t(MODE_LABEL[m])}
          </button>
        ))}
      </div>

      {mode === 'movements' ? (
        <button
          className="inline-flex min-h-[44px] items-center text-accent"
          onClick={() => chooseMode(storedMode)}
        >
          ‹ {t('nav.reports')}
        </button>
      ) : (
        <AccountChips accounts={accounts} value={scope} onChange={setAccountId} />
      )}

      {(mode === 'month' || mode === 'year') && (
        <div className="flex items-center justify-between">
          <button
            className="btn-secondary !min-w-[44px] !px-3"
            aria-label={t('reports.previous')}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 font-display text-[20px] font-medium capitalize tracking-[-0.02em]"
            aria-haspopup="dialog"
            aria-label={t(mode === 'month' ? 'reports.pickMonth' : 'reports.pickYear')}
            onClick={() => setPicking(true)}
          >
            {title}
            <span aria-hidden="true" className="text-[13px] text-muted">
              ▾
            </span>
          </button>
          <button
            className="btn-secondary !min-w-[44px] !px-3"
            aria-label={t('reports.next')}
            onClick={() => step(1)}
          >
            ›
          </button>
        </div>
      )}

      {picking && (mode === 'month' || mode === 'year') && (
        <PeriodPicker
          mode={mode}
          value={mode === 'month' ? month : year}
          firstYear={firstDate ? Number(firstDate.slice(0, 4)) : undefined}
          onPick={(v) => {
            if (mode === 'month') setMonth(v);
            else setYear(v);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      <div className="min-h-[50vh]">
        {mode === 'month' && (
          <MonthView month={month} accountId={scope} onReport={setMonthReport} />
        )}
        {mode === 'year' && <YearView year={year} accountId={scope} onReport={setYearReport} />}
        {mode === 'wealth' && <WealthView accountId={scope} />}
        {mode === 'movements' && (
          <MovementsPanel key={params.toString()} initial={filterFromParams(params)} />
        )}
      </div>
    </Screen>
  );
}
