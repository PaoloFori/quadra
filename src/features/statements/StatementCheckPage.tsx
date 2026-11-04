import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Screen } from '@/components/Screen';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import {
  compareStatement,
  parseStatement,
  UnsupportedStatementError,
  type CheckedTx,
  type StatementCheck,
} from '@/domain/statements';
import { useFormat } from '@/i18n/useFormat';
import { readPdfPages } from '@/lib/pdfText';

type Result = { check: StatementCheck; accountName: string; format: string; warnings: string[] };

function Section({
  title,
  hint,
  count,
  tone = 'warn',
  children,
}: {
  title: string;
  hint: string;
  count: number;
  tone?: 'warn' | 'ok';
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="card space-y-2">
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
          {title}
          <span
            className={`rounded-full px-2 py-0.5 text-[12px] ${tone === 'warn' ? 'bg-negative-subtle text-expense' : 'bg-tile text-muted'}`}
          >
            {count}
          </span>
        </h2>
        <p className="text-[13px] text-muted">{hint}</p>
      </div>
      <ul>{children}</ul>
    </section>
  );
}

function Line({
  date,
  cents,
  text,
  extra,
}: {
  date: string;
  cents: number;
  text: string;
  extra?: ReactNode;
}) {
  const f = useFormat();
  return (
    <li className="border-t border-line py-2.5 first:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 break-words">{text || '—'}</span>
        <Amount cents={cents} className="text-[16px]" />
      </div>
      <p className="text-[12px] text-muted">{f.date(date)}</p>
      {extra && <div className="mt-1 text-[13px]">{extra}</div>}
    </li>
  );
}

export default function StatementCheckPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const account = accounts.find((a) => a.id === (accountId || accounts[0]?.id));

  async function onFile(file: File): Promise<void> {
    if (!account) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const statement = parseStatement(await readPdfPages(file));
      const all = await transactionsRepo.all();
      const names = new Map(accounts.map((a) => [a.id, a.name]));
      const own: CheckedTx[] = all.filter((x) => x.accountId === account.id);
      const others = all
        .filter((x) => x.accountId !== account.id)
        .map((x) => ({ ...x, accountName: names.get(x.accountId) ?? '' }));
      setResult({
        check: compareStatement(statement, own, others),
        accountName: account.name,
        format: statement.format,
        warnings: statement.warnings,
      });
    } catch (e) {
      if (e instanceof UnsupportedStatementError) setError(t('statement.unsupported'));
      else {
        console.error(e);
        setError(t('statement.readError'));
      }
    } finally {
      setBusy(false);
    }
  }

  const c = result?.check;
  const diff = c
    ? c.totals.quadraIn - c.totals.quadraOut - (c.totals.statementIn - c.totals.statementOut)
    : 0;

  return (
    <Screen
      title={t('statement.title')}
      action={
        <Link to="/settings" className="btn-secondary">
          {t('common.close')}
        </Link>
      }
    >
      {error && (
        <p role="alert" className="card border border-expense/40 text-expense">
          {error}
        </p>
      )}

      {accounts.length === 0 ? (
        <div className="card space-y-3">
          <h2 className="font-semibold">{t('accounts.needOne')}</h2>
          <p className="text-muted">{t('accounts.needOneBody')}</p>
          <Link to="/settings/accounts" className="btn-primary w-full">
            {t('accounts.addFirst')}
          </Link>
        </div>
      ) : (
        <div className="card space-y-3">
          <p className="text-[13px] text-muted">{t('statement.intro')}</p>
          <div>
            <label className="label" htmlFor="st-account">
              {t('statement.account')}
            </label>
            <select
              id="st-account"
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
            {busy ? t('common.loading') : t('statement.choose')}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void onFile(file);
              }}
            />
          </label>
          <p className="text-[13px] text-muted">{t('statement.formats')}</p>
        </div>
      )}

      {result && c && (
        <>
          <section className="card space-y-1" role="status" aria-label={t('statement.verdict')}>
            <h2 className="font-display text-[20px] font-medium">
              {c.clean ? t('statement.allGood') : t('statement.toCheck')}
            </h2>
            <p className="text-[13px] text-muted">
              {t('statement.summary', {
                account: result.accountName,
                from: f.date(c.from),
                to: f.date(c.to),
                statement: c.statementCount,
                quadra: c.quadraCount,
                matched: c.matched.length,
              })}
            </p>
            {c.likelyWrongAccount && (
              <p className="text-[13px] text-expense">{t('statement.wrongAccount')}</p>
            )}
            {result.warnings.length > 0 && (
              <p className="text-[13px] text-expense">{t('statement.readWarning')}</p>
            )}
          </section>

          <section className="card space-y-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              {t('statement.totals')}
            </h2>
            <dl className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-[14px]">
              <dt />
              <dd className="text-right text-[12px] text-muted">{t('statement.statementCol')}</dd>
              <dd className="text-right text-[12px] text-muted">{t('statement.quadraCol')}</dd>
              <dt className="text-muted">{t('statement.in')}</dt>
              <dd className="text-right">{f.currency(c.totals.statementIn)}</dd>
              <dd className="text-right">{f.currency(c.totals.quadraIn)}</dd>
              <dt className="text-muted">{t('statement.out')}</dt>
              <dd className="text-right">{f.currency(c.totals.statementOut)}</dd>
              <dd className="text-right">{f.currency(c.totals.quadraOut)}</dd>
            </dl>
            <p className={`pt-1 text-[14px] ${diff === 0 ? 'text-muted' : 'text-expense'}`}>
              {diff === 0
                ? t('statement.sumsMatch')
                : t('statement.sumsDiffer', { diff: f.currencySigned(diff) })}
            </p>
          </section>

          <Section
            title={t('statement.missing')}
            hint={t('statement.missingHint')}
            count={c.missingInQuadra.length}
          >
            {c.missingInQuadra.map(({ entry, elsewhere }, i) => (
              <Line
                key={i}
                date={entry.date}
                cents={entry.cents}
                text={entry.description}
                extra={
                  elsewhere && (
                    <span className="text-muted">
                      {t('statement.elsewhere', {
                        account: elsewhere.accountName,
                        date: f.date(elsewhere.date),
                        text: elsewhere.description,
                      })}
                    </span>
                  )
                }
              />
            ))}
          </Section>

          <Section
            title={t('statement.amountDiff')}
            hint={t('statement.amountDiffHint')}
            count={c.amountDiffs.length}
          >
            {c.amountDiffs.map(({ entry, tx }, i) => (
              <Line
                key={i}
                date={entry.date}
                cents={entry.cents}
                text={entry.description}
                extra={
                  <span className="text-muted">
                    {t('statement.inQuadra', {
                      amount: f.currencySigned(tx.amountCents),
                      date: f.date(tx.date),
                      text: tx.description,
                    })}
                  </span>
                }
              />
            ))}
          </Section>

          <Section
            title={t('statement.notInStatement')}
            hint={t('statement.notInStatementHint')}
            count={c.notInStatement.length}
          >
            {c.notInStatement.map(({ tx, pending }) => (
              <Line
                key={tx.id}
                date={tx.date}
                cents={tx.amountCents}
                text={tx.description}
                extra={pending && <span className="text-muted">{t('statement.pending')}</span>}
              />
            ))}
          </Section>

          <Section
            title={t('statement.dateDiff')}
            hint={t('statement.dateDiffHint')}
            count={c.dateDiffs.length}
          >
            {c.dateDiffs.map(({ entry, tx, days }, i) => (
              <Line
                key={i}
                date={tx.date}
                cents={tx.amountCents}
                text={tx.description}
                extra={
                  <span className="text-muted">
                    {t('statement.bankDate', { date: f.date(entry.date), days })}
                  </span>
                }
              />
            ))}
          </Section>

          <Section
            title={t('statement.ok')}
            hint={t('statement.okHint')}
            count={c.matched.length}
            tone="ok"
          >
            <details>
              <summary className="cursor-pointer text-[14px] text-muted">
                {t('statement.show')}
              </summary>
              <ul>
                {c.matched.map(({ entry, tx }, i) => (
                  <Line key={i} date={tx.date} cents={tx.amountCents} text={entry.description} />
                ))}
              </ul>
            </details>
          </Section>
        </>
      )}
    </Screen>
  );
}
