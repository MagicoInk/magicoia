import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { embedText, extractManyTrainingImages } from "@/lib/openai";
import { chunkText } from "@/lib/chunkText";
import { getDb } from "@/lib/firebaseAdmin";
import { COL_CHUNKS, COL_ENTRIES } from "@/lib/rag";

const bodySchema = z.object({
  title: z.string().max(200).optional().nullable(),
  kind: z.enum(["compra", "experto"]),
  channel: z
    .string()
    .optional()
    .nullable()
    .transform((c) => {
      if (c === "instagram" || c === "whatsapp") return c;
      return null;
    }),
  fullText: z.string().min(20, "Escribe al menos 20 caracteres o sube imágenes de la conversación."),
});

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 20;

const CHUNK_WRITE_BATCH = 400;

function assertAdmin(request: NextRequest) {
  const provided = request.headers.get("x-admin-secret");
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return { ok: false as const, response: NextResponse.json({ error: "Falta ADMIN_SECRET en el servidor." }, { status: 500 }) };
  }
  if (provided !== secret) {
    return { ok: false as const, response: NextResponse.json({ error: "Clave de administración incorrecta." }, { status: 401 }) };
  }
  return { ok: true as const };
}

async function imagesToExtractedText(form: FormData): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const list = form.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
  if (!list.length) return { ok: true, text: "" };
  if (list.length > MAX_IMAGES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Máximo ${MAX_IMAGES} imágenes por carga` },
        { status: 400 }
      ),
    };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, response: NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 500 }) };
  }
  const toRead: { base64: string; mime: string }[] = [];
  for (const f of list) {
    const mime = f.type || "image/jpeg";
    if (!IMAGE_TYPES.has(mime)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Solo se admiten JPEG, PNG, WebP o GIF" },
          { status: 400 }
        ),
      };
    }
    if (f.size > MAX_FILE_BYTES) {
      return { ok: false, response: NextResponse.json({ error: "Cada imagen debe ser < 5 MB" }, { status: 400 }) };
    }
    toRead.push({ base64: Buffer.from(await f.arrayBuffer()).toString("base64"), mime });
  }
  const text = await extractManyTrainingImages(toRead);
  return { ok: true, text };
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = assertAdmin(request);
  if (!auth.ok) return auth.response;

  const ct = request.headers.get("content-type") || "";
  let title: string | null;
  let kind: "compra" | "experto";
  let channel: string | null;
  let fullText: string;

  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const t = String(form.get("title") || "").trim();
    title = t || null;
    const k = form.get("kind");
    if (k !== "compra" && k !== "experto") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    kind = k;
    const ch = String(form.get("channel") || "");
    channel = ch === "instagram" || ch === "whatsapp" ? ch : null;
    const pasted = String(form.get("fullText") || "").trim();
    const extractedResult = await imagesToExtractedText(form);
    if (!extractedResult.ok) return extractedResult.response;
    const extracted = extractedResult.text.trim();
    fullText = [pasted, extracted].filter(Boolean).join("\n\n---\n\n");
    if (fullText.length < 20) {
      return NextResponse.json(
        { error: "Añade texto o capturas con conversación legible (mín. 20 caracteres en total)." },
        { status: 400 }
      );
    }
  } else {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    title = parsed.data.title ?? null;
    kind = parsed.data.kind;
    channel = parsed.data.channel;
    fullText = parsed.data.fullText;
  }

  const parts = chunkText(fullText);
  if (!parts.length) {
    return NextResponse.json({ error: "No se pudo trocear el texto" }, { status: 400 });
  }

  const db = getDb();
  const entryRef = db.collection(COL_ENTRIES).doc();
  const t = title ?? null;
  const ch = channel ?? null;

  await entryRef.set({
    title: t,
    kind,
    channel: ch,
    fullText,
    chunkCount: parts.length,
    createdAt: FieldValue.serverTimestamp(),
  });

  for (let start = 0; start < parts.length; start += CHUNK_WRITE_BATCH) {
    const batch = db.batch();
    const slice = parts.slice(start, start + CHUNK_WRITE_BATCH);
    for (let j = 0; j < slice.length; j++) {
      const i = start + j;
      const part = slice[j]!;
      const emb = await embedText(part);
      const chunkRef = db.collection(COL_CHUNKS).doc();
      batch.set(chunkRef, {
        entryId: entryRef.id,
        text: part,
        embedding: emb,
        kind,
        channel: ch,
        title: t,
        orderIdx: i,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return NextResponse.json({
    ok: true,
    id: entryRef.id,
    chunkCount: parts.length,
  });
}

function entryCreatedAtToIso(created: unknown): string {
  if (created instanceof Timestamp) {
    return created.toDate().toISOString();
  }
  if (typeof created === "string") return new Date(created).toISOString();
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  const auth = assertAdmin(request);
  if (!auth.ok) return auth.response;

  const db = getDb();
  const snap = await db.collection(COL_ENTRIES).orderBy("createdAt", "desc").get();
  const entries = snap.docs.map((d) => {
    const v = d.data() as { title?: string | null; kind?: string; channel?: string | null; createdAt?: unknown; chunkCount?: number };
    return {
      id: d.id,
      title: v.title ?? null,
      kind: v.kind ?? "compra",
      channel: v.channel ?? null,
      createdAt: entryCreatedAtToIso(v.createdAt),
      _count: { chunks: typeof v.chunkCount === "number" ? v.chunkCount : 0 },
    };
  });
  return NextResponse.json({ entries });
}

export async function DELETE(request: NextRequest) {
  const auth = assertAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const db = getDb();
  const deleteAllChunks = async () => {
    const s = await db.collection(COL_CHUNKS).where("entryId", "==", id).limit(450).get();
    if (s.empty) return;
    const b = db.batch();
    s.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
    await deleteAllChunks();
  };
  await deleteAllChunks();
  await db.collection(COL_ENTRIES).doc(id).delete();
  return NextResponse.json({ ok: true });
}
