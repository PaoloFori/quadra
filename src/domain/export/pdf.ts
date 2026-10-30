/** Modello di documento indipendente dalla lingua: chi lo costruisce passa testi già tradotti. */
export interface PdfRow {
  label: string;
  value: string;
  bar?: { ratio: number; color: string };
}

export interface PdfSection {
  heading: string;
  rows: PdfRow[];
}

export interface PdfDoc {
  title: string;
  subtitle: string;
  sections: PdfSection[];
}

/** jsPDF usa font standard: niente € né spazi stretti di Intl. */
const WIDE_SPACES = new RegExp('[\u00a0\u202f]', 'g');
export const pdfSafe = (text: string): string =>
  text.replace(/€/g, 'EUR').replace(WIDE_SPACES, ' ');

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function renderPdf(doc: PdfDoc): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const bottom = pdf.internal.pageSize.getHeight() - margin;
  let y = margin;

  const ensure = (needed: number): void => {
    if (y + needed > bottom) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont('helvetica', 'bold').setFontSize(20);
  pdf.text(pdfSafe(doc.title), margin, y + 6);
  y += 12;
  pdf.setFont('helvetica', 'normal').setFontSize(11).setTextColor(110);
  pdf.text(pdfSafe(doc.subtitle), margin, y);
  y += 10;

  for (const section of doc.sections) {
    ensure(16);
    pdf.setFont('helvetica', 'bold').setFontSize(13).setTextColor(0);
    pdf.text(pdfSafe(section.heading), margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal').setFontSize(10.5);
    for (const row of section.rows) {
      ensure(row.bar ? 9 : 6.5);
      pdf.setTextColor(30).text(pdfSafe(row.label), margin, y, { maxWidth: width * 0.6 });
      pdf.text(pdfSafe(row.value), margin + width, y, { align: 'right' });
      if (row.bar) {
        const [r, g, b] = hexToRgb(row.bar.color);
        pdf
          .setFillColor(r, g, b)
          .rect(margin, y + 1.5, Math.max(0.5, width * Math.min(1, row.bar.ratio)), 1.8, 'F');
        y += 3;
      }
      y += 6;
    }
    y += 4;
  }
  return pdf.output('blob');
}
