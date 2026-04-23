import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "./firebaseAdmin";

const COL = "artists";
const CHATS = "chatHistory";

export type ArtistDoc = {
  username: string;
  passwordHash: string;
  displayName: string;
  agentContext: string;
  createdAt: FirebaseFirestore.FieldValue | Timestamp;
};

export async function getArtistByUsername(username: string) {
  const u = username.trim().toLowerCase();
  if (!u) return null;
  const db = getDb();
  const q = await db.collection(COL).where("username", "==", u).limit(1).get();
  if (q.empty) return null;
  const d = q.docs[0]!;
  return { id: d.id, data: d.data() as ArtistDoc };
}

export async function getArtistById(id: string) {
  const db = getDb();
  const d = await db.collection(COL).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, data: d.data() as ArtistDoc };
}

export async function createArtist(input: {
  username: string;
  passwordHash: string;
  displayName: string;
}): Promise<{ id: string }> {
  const u = input.username.trim().toLowerCase();
  const existing = await getArtistByUsername(u);
  if (existing) {
    throw new Error("Ese usuario ya existe");
  }
  const db = getDb();
  const ref = await db.collection(COL).add({
    username: u,
    passwordHash: input.passwordHash,
    displayName: input.displayName.trim() || u,
    agentContext: "",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateArtistContext(artistId: string, agentContext: string) {
  const db = getDb();
  await db
    .collection(COL)
    .doc(artistId)
    .update({ agentContext: agentContext.slice(0, 8000), updatedAt: FieldValue.serverTimestamp() });
}

export type ChatLogPayload = {
  artistId: string;
  transcribed: string;
  summary: string;
  suggestions: { text: string; reasoning?: string }[];
  referencesUsed: number;
};

export async function saveChatLog(p: ChatLogPayload) {
  const db = getDb();
  const inputPreview = p.transcribed.slice(0, 200);
  await db.collection(CHATS).add({
    artistId: p.artistId,
    transcribed: p.transcribed.slice(0, 50000),
    summary: p.summary.slice(0, 2000),
    suggestions: JSON.stringify(p.suggestions).slice(0, 100000),
    referencesUsed: p.referencesUsed,
    inputPreview,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listChatsForArtist(artistId: string, limit = 50) {
  const db = getDb();
  const snap = await db
    .collection(CHATS)
    .where("artistId", "==", artistId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const v = d.data() as {
      transcribed?: string;
      summary?: string;
      suggestions?: string;
      referencesUsed?: number;
      inputPreview?: string;
      createdAt?: Timestamp;
    };
    let suggestions: { text: string; reasoning?: string }[] = [];
    try {
      suggestions = v.suggestions ? (JSON.parse(v.suggestions) as { text: string; reasoning?: string }[]) : [];
    } catch {
      // ignore
    }
    return {
      id: d.id,
      inputPreview: v.inputPreview ?? "",
      summary: v.summary ?? "",
      transcribed: v.transcribed ?? "",
      suggestions,
      referencesUsed: v.referencesUsed ?? 0,
      createdAt: v.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    };
  });
}

export { CHATS, COL as ARTISTS_COL };
