export function parseEmbedding(s: string): number[] {
  return JSON.parse(s) as number[];
}

/** Acepta JSON string o vector ya extraído de Firestore (array de números) */
export function parseEmbeddingField(embedding: string | number[]): number[] {
  if (Array.isArray(embedding)) return embedding;
  return parseEmbedding(embedding);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
