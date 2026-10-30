import type { IsoDate, MonthKey } from '@/domain/types';

/** Formattatori Intl legati a una lingua: nessuna stringa/valuta hardcoded altrove. */
export interface Formatters {
  currency: (cents: number) => string;
  currencySigned: (cents: number) => string;
  number: (value: number, digits?: number) => string;
  percent: (ratio: number) => string;
  date: (iso: IsoDate) => string;
  dateLong: (iso: IsoDate) => string;
  month: (key: MonthKey) => string;
  monthShort: (key: MonthKey) => string;
  dateTime: (iso: string) => string;
}

function parse(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d ?? 1);
}

export function createFormatters(locale: string): Formatters {
  const eur = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
  const eurSigned = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    signDisplay: 'exceptZero',
  });
  const pct = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  });
  const dShort = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
  const dLong = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const mLong = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const mShort = new Intl.DateTimeFormat(locale, { month: 'short' });
  const dt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return {
    currency: (c) => eur.format(c / 100),
    currencySigned: (c) => eurSigned.format(c / 100),
    number: (v, digits = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v),
    percent: (r) => pct.format(r),
    date: (iso) => dShort.format(parse(iso)),
    dateLong: (iso) => dLong.format(parse(iso)),
    month: (k) => mLong.format(parse(`${k}-01`)),
    monthShort: (k) => mShort.format(parse(`${k}-01`)),
    dateTime: (iso) => dt.format(new Date(iso)),
  };
}
