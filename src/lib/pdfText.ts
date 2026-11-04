import type { PdfItem, PdfPage } from '@/domain/statements/types';

/** Parte di TextContent di pdf.js che ci serve (gli elementi senza `str` sono marcatori, si ignorano). */
interface RawItem {
  str?: string;
  transform?: number[];
  width?: number;
}

export function toPdfPage(items: readonly object[]): PdfPage {
  const out: PdfItem[] = [];
  for (const i of items as RawItem[]) {
    if (typeof i.str === 'string' && i.transform && i.str.trim() !== '') {
      out.push({ str: i.str, x: i.transform[4]!, y: i.transform[5]!, w: i.width ?? 0 });
    }
  }
  return { items: out };
}

/** Legge il testo (con le posizioni) di tutte le pagine di un PDF, nel browser, senza inviarlo a nessuno. */
export async function readPdfPages(file: File): Promise<PdfPage[]> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pages: PdfPage[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      pages.push(toPdfPage(content.items as RawItem[]));
    }
    return pages;
  } finally {
    void doc.destroy();
  }
}
