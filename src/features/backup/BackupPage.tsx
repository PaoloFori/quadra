import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import {
  exportBackup,
  markBackupDone,
  previewRestore,
  restoreBackup,
  type RestoreMode,
} from '@/db/backupService';
import { getSettings } from '@/db/settings';
import {
  backupFilename,
  BackupError,
  parseBackup,
  type BackupFile,
  type BackupRange,
} from '@/domain/backup/format';
import type { RestorePreview } from '@/domain/backup/merge';
import { transactionsToCsv } from '@/domain/export/csv';
import { monthOf, todayIso } from '@/lib/dates';
import { saveFile } from '@/lib/files';
import { getStorageStatus, requestPersistence, type StorageStatus } from '@/lib/storage';
import { useFormat } from '@/i18n/useFormat';

type Scope = 'month' | 'year' | 'all';

function StorageCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  useEffect(() => void getStorageStatus().then(setStatus), []);
  const request = async (): Promise<void> => {
    await requestPersistence();
    setStatus(await getStorageStatus());
  };
  return (
    <section className="card space-y-2">
      <h2 className="font-semibold">{t('backup.storage.title')}</h2>
      <p className="text-[14px]">
        {!status
          ? t('common.loading')
          : !status.supported
            ? t('backup.storage.unsupported')
            : status.persisted
              ? `✅ ${t('backup.storage.persisted')}`
              : `⚠️ ${t('backup.storage.notPersisted')}`}
      </p>
      {status?.supported && !status.persisted && (
        <button className="btn-secondary w-full" onClick={() => void request()}>
          {t('backup.storage.request')}
        </button>
      )}
      <p className="text-[13px] text-muted">{t('backup.storage.warning')}</p>
    </section>
  );
}

function ExportCard({ onSaved }: { onSaved: (msg: string) => void }) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<Scope>('month');
  const [month, setMonth] = useState(monthOf(todayIso()));
  const [year, setYear] = useState(todayIso().slice(0, 4));
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [busy, setBusy] = useState(false);

  async function run(): Promise<void> {
    const range: BackupRange =
      scope === 'all'
        ? { kind: 'all' }
        : scope === 'month'
          ? { kind: 'month', value: month }
          : { kind: 'year', value: year };
    setBusy(true);
    try {
      const file = await exportBackup(range);
      const base = backupFilename(range).replace(/\.json$/, '');
      const blob =
        format === 'json'
          ? new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' })
          : new Blob([transactionsToCsv(file.data.transactions)], { type: 'text/csv' });
      const result = await saveFile(blob, `${base.replace('backup', 'export')}.${format}`);
      if (result !== 'cancelled') {
        // Un export parziale non conta come backup completo.
        if (scope === 'all' && format === 'json') await markBackupDone();
        onSaved(t('backup.saved'));
      }
    } catch (e) {
      console.error(e);
      onSaved(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{t('backup.export.title')}</h2>
      <div>
        <label className="label" htmlFor="ex-scope">
          {t('backup.export.range')}
        </label>
        <select
          id="ex-scope"
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
        >
          <option value="month">{t('backup.export.month')}</option>
          <option value="year">{t('backup.export.year')}</option>
          <option value="all">{t('backup.export.all')}</option>
        </select>
      </div>
      {scope === 'month' && (
        <input
          aria-label={t('backup.export.month')}
          type="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      )}
      {scope === 'year' && (
        <input
          aria-label={t('backup.export.year')}
          type="number"
          className="input"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      )}
      <div>
        <label className="label" htmlFor="ex-format">
          {t('backup.export.format')}
        </label>
        <select
          id="ex-format"
          className="input"
          value={format}
          onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
        >
          <option value="json">{t('backup.export.json')}</option>
          <option value="csv">{t('backup.export.csv')}</option>
        </select>
      </div>
      <button
        className="btn-secondary w-full"
        disabled={
          busy || (scope === 'month' && !month) || (scope === 'year' && !/^\d{4}$/.test(year))
        }
        onClick={() => void run()}
      >
        {t('backup.export.action')}
      </button>
    </section>
  );
}

function RestoreCard({ onDone }: { onDone: (msg: string) => void }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<BackupFile | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(f: File): Promise<void> {
    setError(null);
    setFile(null);
    setPreview(null);
    try {
      const parsed = await parseBackup(await f.text());
      setPreview(await previewRestore(parsed));
      setFile(parsed);
    } catch (e) {
      if (e instanceof BackupError)
        setError(
          t(
            e.code === 'checksum'
              ? 'errors.backupChecksum'
              : e.code === 'tooNew'
                ? 'errors.backupTooNew'
                : 'errors.backupInvalid',
          ),
        );
      else {
        console.error(e);
        setError(t('errors.fileRead'));
      }
    }
  }

  async function apply(mode: RestoreMode): Promise<void> {
    if (!file) return;
    if (mode === 'replace' && !window.confirm(t('backup.restore.confirmReplace'))) return;
    setBusy(true);
    try {
      await restoreBackup(file, mode);
      setFile(null);
      setPreview(null);
      onDone(t('backup.restore.done'));
    } catch (e) {
      console.error(e);
      setError(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  const tx = preview?.transactions;
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{t('backup.restore.title')}</h2>
      <label className="btn-secondary w-full cursor-pointer">
        {t('backup.restore.choose')}
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void load(f);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-expense">
          {error}
        </p>
      )}
      {file && tx && (
        <>
          <p className="text-lg font-bold">
            {t('backup.restore.summary', {
              added: tx.added,
              existing: tx.existing,
              conflicts: tx.conflicts,
            })}
          </p>
          <p className="text-[13px] text-muted">{t('backup.restore.mergeHint')}</p>
          <button
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => void apply('merge')}
          >
            {t('backup.restore.merge')}
          </button>
          <button
            className="btn-danger w-full"
            disabled={busy}
            onClick={() => void apply('replace')}
          >
            {t('backup.restore.replace')}
          </button>
        </>
      )}
    </section>
  );
}

export default function BackupPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useLiveQuery(getSettings, []);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fullBackup(): Promise<void> {
    setBusy(true);
    try {
      const range: BackupRange = { kind: 'all' };
      const file = await exportBackup(range);
      const result = await saveFile(
        new Blob([JSON.stringify(file)], { type: 'application/json' }),
        backupFilename(range),
      );
      if (result !== 'cancelled') {
        await markBackupDone();
        setMessage(t('backup.saved'));
      }
    } catch (e) {
      console.error(e);
      setMessage(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('backup.title')}>
      <Link to="/settings" className="mb-2 inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      {message && (
        <p role="status" className="card mb-3 text-income">
          {message}
        </p>
      )}
      <div className="space-y-3">
        <section className="card space-y-3">
          <h2 className="font-semibold">{t('backup.full.title')}</h2>
          <p className="text-[14px] text-muted">
            {settings?.lastBackupAt
              ? t('backup.full.last', { date: f.dateTime(settings.lastBackupAt) })
              : t('backup.full.never')}
          </p>
          <button className="btn-primary w-full" disabled={busy} onClick={() => void fullBackup()}>
            {t('backup.full.action')}
          </button>
          <p className="text-[13px] text-muted">{t('backup.full.hint')}</p>
        </section>
        <ExportCard onSaved={setMessage} />
        <RestoreCard onDone={setMessage} />
        <StorageCard />
      </div>
    </Screen>
  );
}
