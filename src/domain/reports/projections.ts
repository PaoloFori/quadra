import { monthOf, shiftMonth } from '@/lib/dates';
import type { IsoDate, MonthKey, Transaction } from '../types';
import { totalsOf, type Totals } from './totals';

export interface WealthPoint {
  month: MonthKey;
  cents: number;
}

/**
 * Patrimonio a fine mese per gli ultimi `months` mesi (il corrente incluso, valore = quello di oggi).
 * Si ricostruisce all'indietro dal saldo attuale togliendo i movimenti successivi: nessuno snapshot da salvare.
 */
export function wealthSeries(
  currentCents: number,
  txs: readonly Transaction[],
  today: IsoDate,
  months = 12,
): WealthPoint[] {
  const current = monthOf(today);
  const points: WealthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = shiftMonth(current, -i);
    if (i === 0) {
      points.push({ month, cents: currentCents });
      continue;
    }
    // fine mese = ultimo giorno: tutto ciò che è successo dopo si toglie dal saldo di oggi
    const after = txs.reduce((sum, t) => (monthOf(t.date) > month ? sum + t.amountCents : sum), 0);
    points.push({ month, cents: currentCents - after });
  }
  return points;
}

export interface MonthlyFlow extends Totals {
  month: MonthKey;
}

/** Entrate e uscite degli ultimi `count` mesi COMPLETI (il mese in corso è escluso: sarebbe parziale). */
export function lastFullMonths(
  txs: readonly Transaction[],
  today: IsoDate,
  count = 3,
): MonthlyFlow[] {
  const current = monthOf(today);
  return Array.from({ length: count }, (_, i) => shiftMonth(current, -(count - i))).map(
    (month) => ({
      month,
      ...totalsOf(txs.filter((t) => monthOf(t.date) === month)),
    }),
  );
}

export interface Trend {
  /** Risparmio medio mensile: entrate meno uscite. */
  avgSavingCents: number;
  avgIncomeCents: number;
  avgExpensesCents: number;
  in6Months: number;
  in12Months: number;
  /** Servono almeno 3 mesi con movimenti: sotto, la stima è solo indicativa. */
  sufficientHistory: boolean;
}

/** «A questo ritmo»: media degli ultimi mesi completi proiettata in avanti. */
export function trend(currentCents: number, flows: readonly MonthlyFlow[]): Trend {
  const n = flows.length || 1;
  const sum = (pick: (f: MonthlyFlow) => number): number =>
    Math.round(flows.reduce((s, f) => s + pick(f), 0) / n);
  const avgSavingCents = sum((f) => f.net);
  return {
    avgSavingCents,
    avgIncomeCents: sum((f) => f.income),
    avgExpensesCents: sum((f) => f.expenses),
    in6Months: currentCents + avgSavingCents * 6,
    in12Months: currentCents + avgSavingCents * 12,
    sufficientHistory: flows.length >= 3 && flows.every((f) => f.income > 0 || f.expenses > 0),
  };
}

export type GoalStatus = 'past' | 'tooSoon' | 'ok';

export interface GoalResult {
  status: GoalStatus;
  monthsRemaining: number;
  /** Quanto mettere da parte ogni mese per arrivare al traguardo. */
  requiredPerMonthCents: number;
  /** Spesa mensile massima, partendo dalle entrate medie. */
  maxSpendPerMonthCents: number;
  /** Con le entrate medie, la spesa massima non è negativa. */
  feasible: boolean;
  /** Già oggi: il patrimonio basta per il traguardo. */
  reached: boolean;
}

function monthsBetween(from: IsoDate, to: IsoDate): number {
  const diff =
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
  return to.slice(8, 10) < from.slice(8, 10) ? diff - 1 : diff;
}

export function savingsGoal(input: {
  targetCents: number;
  targetDate: IsoDate;
  currentCents: number;
  avgIncomeCents: number;
  today: IsoDate;
}): GoalResult {
  const { targetCents, targetDate, currentCents, avgIncomeCents, today } = input;
  const missing = targetCents - currentCents;
  const empty = { requiredPerMonthCents: 0, maxSpendPerMonthCents: 0, feasible: false };
  if (targetDate <= today)
    return { status: 'past', monthsRemaining: 0, reached: missing <= 0, ...empty };
  const monthsRemaining = monthsBetween(today, targetDate);
  if (monthsRemaining <= 0)
    return {
      status: 'tooSoon',
      monthsRemaining: 0,
      reached: missing <= 0,
      ...empty,
      requiredPerMonthCents: Math.max(missing, 0),
    };
  const requiredPerMonthCents = Math.max(0, Math.ceil(missing / monthsRemaining));
  const maxSpendPerMonthCents = avgIncomeCents - requiredPerMonthCents;
  return {
    status: 'ok',
    monthsRemaining,
    requiredPerMonthCents,
    maxSpendPerMonthCents,
    feasible: maxSpendPerMonthCents >= 0,
    reached: missing <= 0,
  };
}

export interface WealthProjection {
  months: MonthKey[];
  values: number[];
  /** Indice da cui i valori sono una stima (coda tratteggiata). */
  projectedFrom: number;
  /** Variazione negli ultimi (fino a) 6 mesi reali e quanti mesi copre. */
  delta: { cents: number; months: number };
}

/** Serie reale + coda stimata (`ahead` mesi al ritmo del risparmio medio) per il grafico del patrimonio. */
export function projectWealth(
  series: readonly WealthPoint[],
  avgSavingCents: number,
  ahead = 4,
): WealthProjection {
  const last = series[series.length - 1];
  const tail = last
    ? Array.from({ length: ahead }, (_, i) => ({
        month: shiftMonth(last.month, i + 1),
        cents: last.cents + avgSavingCents * (i + 1),
      }))
    : [];
  const span = Math.min(6, series.length - 1);
  const base = series[series.length - 1 - span];
  return {
    months: [...series, ...tail].map((p) => p.month),
    values: [...series, ...tail].map((p) => p.cents),
    projectedFrom: series.length,
    delta: { cents: last && base ? last.cents - base.cents : 0, months: Math.max(span, 0) },
  };
}
