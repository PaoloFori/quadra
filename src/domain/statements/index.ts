import { isModo1, parseModo1 } from './modo1';
import { isModo2, parseModo2 } from './modo2';
import { type PdfPage, type Statement, UnsupportedStatementError } from './types';

export * from './types';
export { compareStatement } from './compare';
export type { CheckedTx, StatementCheck } from './compare';

/** Riconosce il formato dell'estratto e lo legge; se non è tra quelli noti lancia UnsupportedStatementError. */
export function parseStatement(pages: PdfPage[]): Statement {
  if (isModo2(pages)) return parseModo2(pages);
  if (isModo1(pages)) return parseModo1(pages);
  throw new UnsupportedStatementError();
}
