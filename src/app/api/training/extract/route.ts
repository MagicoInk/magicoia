import { NextRequest, NextResponse } from "next/server";
import { extractManyTrainingImages } from "@/lib/openai";

export const maxDuration = 300;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_FILES = 20;

function assertAdmin(request: NextRequest) {
  const provided = request.headers.get("x-admin-secret");
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return { ok: false as const, response: NextResponse.json({ error: "Falta ADMIN_SECRET" }, { status: 500 }) };
  }
  if (provided !== secret) {
    return { ok: false as const, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 500 });
  }
  const auth = assertAdmin(request);
  if (!auth.ok) return auth.response;

  const form = await request.formData();
  const filesRaw = form.getAll("images");
  const toRead: { base64: string; mime: string }[] = [];
  for (const item of filesRaw) {
    if (!(item instanceof File) || !item.size) continue;
    const mime = item.type || "image/jpeg";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: `Formato no admitido: ${mime}. Usa JPEG, PNG, WebP o GIF.` },
        { status: 400 }
      );
    }
    if (item.size > MAX_FILE) {
      return NextResponse.json({ error: "Cada imagen debe ser menor a 5 MB" }, { status: 400 });
    }
    const buf = Buffer.from(await item.arrayBuffer());
    toRead.push({ base64: buf.toString("base64"), mime });
  }
  if (!toRead.length) {
    return NextResponse.json({ error: "Añade al menos una imagen" }, { status: 400 });
  }
  if (toRead.length > MAX_FILES) {
    return NextResponse.json({ error: `Máximo ${MAX_FILES} imágenes por lote` }, { status: 400 });
  }

  try {
    const text = await extractManyTrainingImages(toRead);
    if (!text.trim() || text.trim().length < 5) {
      return NextResponse.json(
        { error: "No se pudo leer texto en las imágenes. Revisa resolución o vuelve a subir la captura." },
        { status: 400 }
      );
    }
    return NextResponse.json({ text });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error al leer imágenes";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
