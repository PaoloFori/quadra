/** Minuscolo, senza accenti, spazi compressi: base per hash, regole e ricerca. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Come `normalizeText`, ma toglie anche numeri/riferimenti variabili (usato per rilevare ricorrenze e regole). */
export function descriptionKey(text: string): string {
  return normalizeText(text)
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
