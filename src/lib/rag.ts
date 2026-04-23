import { embedText } from "./openai";
import { cosine, parseEmbeddingField } from "./vectors";
import { getDb } from "./firebaseAdmin";

const COL_CHUNKS = "trainingChunks";
const COL_ENTRIES = "trainingEntries";
const TOP_K = 10;

export type RagBlock = {
  text: string;
  kind: string;
  channel: string | null;
  title: string | null;
};

type ChunkDoc = {
  entryId: string;
  text: string;
  embedding: number[] | string;
  kind: string;
  channel: string | null;
  title: string | null;
  orderIdx: number;
  createdAt?: unknown;
};

export async function retrieveSimilar(query: string, topK: number = TOP_K): Promise<RagBlock[]> {
  const db = getDb();
  const snap = await db.collection(COL_CHUNKS).get();
  const all: ChunkDoc[] = snap.docs.map((d) => d.data() as ChunkDoc);
  if (!all.length) return [];
  const qv = await embedText(query);
  const scored = all
    .map((c) => {
      const emb = parseEmbeddingField(c.embedding);
      if (!emb.length) return { score: 0, c: null as ChunkDoc | null };
      return { score: cosine(qv, emb), c };
    })
    .filter((s): s is { score: number; c: ChunkDoc } => s.c !== null && s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => ({
    text: s.c.text,
    kind: s.c.kind,
    channel: s.c.channel ?? null,
    title: s.c.title ?? null,
  }));
}

export async function countEntries(): Promise<{ entries: number; chunks: number }> {
  const db = getDb();
  const [es, cs] = await Promise.all([db.collection(COL_ENTRIES).get(), db.collection(COL_CHUNKS).get()]);
  return { entries: es.size, chunks: cs.size };
}

export { COL_CHUNKS, COL_ENTRIES };
