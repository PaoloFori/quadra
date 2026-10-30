import { useCallback, useRef, useState, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useCategoryLookup } from '@/db/hooks';
import { renderPdf } from '@/domain/export/pdf';
import type { MonthReport } from '@/domain/reports/month';
import type { YearReport } from '@/domain/reports/year';
import { monthOf, shiftMonth, todayIso } from '@/lib/dates';
import { saveFile } from '@/lib/files';
import { useFormat } from '@/i18n/useFormat';
import { MonthView } from './MonthView';
import { monthPdfDoc, yearPdfDoc } from './pdfDocs';
import { YearView } from './YearView';

type Mode = 'month' | 'year';
const SWIPE_PX = 60;

export default function ReportsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(monthOf(todayIso()));
  const [year, setYear] = useState(todayIso().slice(0, 4));
  const monthReport = useRef<MonthReport | undefined>(undefined);
  const yearReport = useRef<YearReport | undefined>(undefined);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  const step = (delta: number): void => {
    if (mode === 'month') setMonth((m) => shiftMonth(m, delta));
    else setYear((y) => String(Number(y) + delta));
  };

  const onTouchStart = (e: TouchEvent): void => {
    const p = e.touches[0];
    touchStart.current = p ? { x: p.clientX, y: p.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent): void => {
    const start = touchStart.current;
    const p = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(p.clientY - start.y) * 1.5)
      step(dx > 0 ? -1 : 1);
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
      await saveFile(await renderPdf(doc), `quadra-${mode === 'month' ? month : year}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const title = mode === 'month' ? f.month(month) : year;

  return (
    <Screen
      title={t('nav.reports')}
      action={
        <button className="btn-secondary" disabled={exporting} onClick={() => void exportPdf()}>
          PDF
        </button>
      }
    >
      <div
        role="group"
        aria-label={t('nav.reports')}
        className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1"
      >
        {(['month', 'year'] as const).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-[40px] rounded-lg text-[15px] font-semibold ${mode === m ? 'bg-card shadow-sm' : 'text-muted'}`}
          >
            {t(`reports.${m === 'month' ? 'monthly' : 'yearly'}`)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          className="btn-secondary !min-w-[44px] !px-3"
          aria-label={t('reports.previous')}
          onClick={() => step(-1)}
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold capitalize">{title}</h2>
        <button
          className="btn-secondary !min-w-[44px] !px-3"
          aria-label={t('reports.next')}
          onClick={() => step(1)}
        >
          ›
        </button>
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-[50vh]">
        {mode === 'month' ? (
          <MonthView month={month} onReport={setMonthReport} />
        ) : (
          <YearView year={year} onReport={setYearReport} />
        )}
      </div>
    </Screen>
  );
}
