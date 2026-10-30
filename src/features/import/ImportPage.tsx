import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useAccounts } from '@/db/hooks';
import { commitImport } from '@/db/importService';
import { analyzeManual, type FormatAnalysis } from '@/domain/importing/analyze';
import { UnsupportedFileError, type Table } from '@/domain/importing/table';
import type { ColumnMapping } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { Amount } from '@/components/Amount';
import { buildPreview, EmptyImportError, loadFile, profileToSave, type BuiltPreview } from './flow';
import { ManualMapping } from './ManualMapping';

type Stage =
  | { name: 'pick' }
  | { name: 'map'; table: Table }
  | { name: 'preview'; table: Table; analysis: FormatAnalysis; built: BuiltPreview }
  | { name: 'done'; count: number };

export default function ImportPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const [accountId, setAccountId] = useState('');
  const [stage, setStage] = useState<Stage>({ name: 'pick' });
  const [markTransfers, setMarkTransfers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const account = accounts.find((a) => a.id === (accountId || accounts[0]?.id));

  async function run(task: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      if (e instanceof UnsupportedFileError) setError(t('errors.fileUnsupported'));
      else if (e instanceof EmptyImportError) setError(t('errors.fileEmpty'));
      else {
        console.error(e);
        setError(t('errors.fileRead'));
      }
    } finally {
      setBusy(false);
    }
  }

  const showPreview = async (table: Table, analysis: FormatAnalysis): Promise<void> => {
    const built = await buildPreview(account!.id, table, analysis);
    setStage({ name: 'preview', table, analysis, built });
  };

  const onFile = (file: File): Promise<void> =>
    run(async () => {
      const { table, analysis } = await loadFile(file);
      if (analysis) await showPreview(table, analysis);
      else setStage({ name: 'map', table });
    });

  const onMapped = (table: Table, headerRow: number, mapping: ColumnMapping): Promise<void> =>
    run(() => showPreview(table, analyzeManual(table, headerRow, mapping)));

  const onConfirm = (s: Extract<Stage, { name: 'preview' }>): Promise<void> =>
    run(async () => {
      const count = await commitImport(s.built.preview, {
        markTransfers,
        profile: profileToSave(s.analysis, account!),
      });
      setStage({ name: 'done', count });
    });

  return (
    <Screen
      title={t('import.title')}
      action={
        <Link to="/transactions" className="btn-secondary">
          {t('common.close')}
        </Link>
      }
    >
      {error && (
        <p role="alert" className="card mb-3 border border-expense/40 text-expense">
          {error}
        </p>
      )}

      {stage.name === 'pick' && (
        <div className="card space-y-3">
          <div>
            <label className="label" htmlFor="imp-account">
              {t('import.account')}
            </label>
            <select
              id="imp-account"
              className="input"
              value={account?.id ?? ''}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <label className="btn-primary w-full cursor-pointer">
            {busy ? t('common.loading') : t('import.chooseFile')}
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt,text/csv"
              className="sr-only"
              disabled={busy || !account}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void onFile(file);
              }}
            />
          </label>
          <p className="text-[13px] text-muted">{t('import.hint')}</p>
        </div>
      )}

      {stage.name === 'map' && (
        <div className="card">
          <ManualMapping
            table={stage.table}
            onCancel={() => setStage({ name: 'pick' })}
            onSubmit={(row, m) => void onMapped(stage.table, row, m)}
          />
        </div>
      )}

      {stage.name === 'preview' && (
        <div className="space-y-3">
          <div className="card">
            <p className="text-xl font-bold">
              {t('import.summary', {
                added: stage.built.preview.newCount,
                existing: stage.built.preview.duplicateCount,
              })}
            </p>
            {stage.built.preview.fromDate && stage.built.preview.toDate && (
              <p className="text-muted">
                {f.date(stage.built.preview.fromDate)} → {f.date(stage.built.preview.toDate)} ·{' '}
                {account?.name}
              </p>
            )}
            {stage.built.preview.skipped > 0 && (
              <p className="text-[13px] text-muted">
                {t('import.skipped', { count: stage.built.preview.skipped })}
              </p>
            )}
            {stage.analysis.source === 'detected' && (
              <p className="text-[13px] text-muted">{t('import.willSaveProfile')}</p>
            )}
          </div>

          {stage.built.preview.transferPairs.length > 0 && (
            <label className="card flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={markTransfers}
                onChange={(e) => setMarkTransfers(e.target.checked)}
              />
              <span>
                {t('import.transfers', { count: stage.built.preview.transferPairs.length })}
              </span>
            </label>
          )}

          <div className="card !p-2">
            <h2 className="section-title !mt-1">{t('import.sample')}</h2>
            <ul>
              {stage.built.preview.candidates
                .filter((c) => c.isNew)
                .slice(0, 5)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 border-b border-line/60 px-1 py-2 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1 text-[15px]">{c.description}</span>
                      <span className="text-[13px] text-muted">{f.date(c.date)}</span>
                    </span>
                    <Amount cents={c.amountCents} className="font-semibold" />
                  </li>
                ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setStage({ name: 'pick' })}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary flex-1"
              disabled={busy || stage.built.preview.newCount === 0}
              onClick={() => void onConfirm(stage)}
            >
              {t('import.confirm', { count: stage.built.preview.newCount })}
            </button>
          </div>
        </div>
      )}

      {stage.name === 'done' && (
        <div className="card space-y-3 text-center">
          <p className="text-xl font-bold">{t('import.done', { count: stage.count })}</p>
          <Link to="/transactions" className="btn-primary w-full">
            {t('import.viewTransactions')}
          </Link>
        </div>
      )}
    </Screen>
  );
}
