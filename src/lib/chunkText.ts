const MAX = 1000;
const MIN = 200;
const OVERLAP = 80;

/** Trocea texto en fragmentos superpuestos para embeddings */
export function chunkText(full: string): string[] {
  const t = full.replace(/\r\n/g, "\n").trim();
  if (t.length <= MAX) return t ? [t] : [];

  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + MAX, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const br = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
      if (br > MIN) end = i + br + 1;
    }
    const piece = t.slice(i, end).trim();
    if (piece) out.push(piece);
    if (end >= t.length) break;
    i = Math.max(0, end - OVERLAP);
  }
  return out;
}
