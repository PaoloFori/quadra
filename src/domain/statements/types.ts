import type { IsoDate } from '@/domain/types';

/** Un frammento di testo di una pagina PDF, con la posizione (origine in basso a sinistra). */
export interface PdfItem {
  str: string;
  x: number;
  y: number;
  /** Larghezza del testo: serve a sapere dove finisce (gli importi sono allineati a destra). */
  w: number;
}
export interface PdfPage {
  items: PdfItem[];
}

export type StatementFormat = 'modo1' | 'modo2';

/** Una riga dell'estratto conto. Importo negativo = uscita. */
export interface StatementEntry {
  /** Data dell'operazione scritta dalla banca. */
  date: IsoDate;
  /** Data valuta: spesso è il giorno in cui hai davvero speso. */
  valueDate: IsoDate;
  cents: number;
  description: string;
}

/** Cose che nella lettura non quadrano: l'estratto va controllato a occhio. */
export type ReadWarning = 'balances' | 'totals';

export interface Statement {
  format: StatementFormat;
  entries: StatementEntry[];
  /** Periodo coperto dall'estratto. */
  from: IsoDate;
  to: IsoDate;
  warnings: ReadWarning[];
}

/** Il PDF non è in uno dei formati che sappiamo leggere. */
export class UnsupportedStatementError extends Error {
  constructor() {
    super('Formato di estratto conto non supportato');
    this.name = 'UnsupportedStatementError';
  }
}
