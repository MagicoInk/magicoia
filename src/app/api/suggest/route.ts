import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { extractTextFromImageBase64, hasLlmApiKey, suggestReplies } from "@/lib/openai";
import { retrieveSimilar, countEntries } from "@/lib/rag";
import { authOptions } from "@/lib/authOptions";
import { getArtistById, saveChatLog } from "@/lib/artistsStore";

export const maxDuration = 120;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Inicia sesión con tu usuario de artista." },
      { status: 401 }
    );
  }
  if (!hasLlmApiKey()) {
    return NextResponse.json(
      { error: "Falta GEMINI_API_KEY (gratis) u OPENAI_API_KEY en el servidor." },
      { status: 500 }
    );
  }
  const stats = await countEntries();
  if (stats.chunks < 1) {
    return NextResponse.json(
      {
        error:
          "Aún no hay conversaciones de entrenamiento. Sube al menos una en /admin con tu clave de administración.",
        stats,
      },
      { status: 400 }
    );
  }

  let currentText = "";
  const ct = request.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    const b = (await request.json()) as { text?: string | null; imageBase64?: string; mimeType?: string };
    if (b.text?.trim()) {
      currentText = b.text.trim();
    }
    if (b.imageBase64 && b.mimeType) {
      if (!ALLOWED.has(b.mimeType)) {
        return NextResponse.json(
          { error: "Solo se admiten imágenes JPEG, PNG, WebP o GIF." },
          { status: 400 }
        );
      }
      const fromImg = await extractTextFromImageBase64(b.imageBase64, b.mimeType);
      if (fromImg.includes("[ilegible]")) {
        return NextResponse.json(
          { error: "No se pudo leer el texto de la imagen. Prueba otra captura o pega el texto a mano." },
          { status: 400 }
        );
      }
      currentText = [currentText, fromImg].filter(Boolean).join("\n\n");
    }
  } else {
    const form = await request.formData();
    const t = form.get("text");
    if (typeof t === "string" && t.trim()) {
      currentText = t.trim();
    }
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      const mime = file.type || "image/jpeg";
      if (!ALLOWED.has(mime)) {
        return NextResponse.json(
          { error: "Solo se admiten imágenes JPEG, PNG, WebP o GIF." },
          { status: 400 }
        );
      }
      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Imagen demasiado grande (máx. 4 MB)" },
          { status: 400 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const b64 = buf.toString("base64");
      const fromImg = await extractTextFromImageBase64(b64, mime);
      if (fromImg.includes("[ilegible]")) {
        return NextResponse.json(
          { error: "No se pudo leer el texto de la imagen. Prueba otra captura o pega el texto a mano." },
          { status: 400 }
        );
      }
      currentText = [currentText, fromImg].filter(Boolean).join("\n\n");
    }
  }

  if (!currentText) {
    return NextResponse.json(
      { error: "Envía al menos un texto o una imagen con la conversación." },
      { status: 400 }
    );
  }

  const artist = await getArtistById(session.user.id);
  const agentContext = artist?.data.agentContext?.trim() ?? "";

  const blocks = await retrieveSimilar(currentText, 10);
  const { summary, suggestions } = await suggestReplies(
    blocks,
    currentText,
    agentContext || undefined
  );

  try {
    await saveChatLog({
      artistId: session.user.id,
      transcribed: currentText,
      summary,
      suggestions,
      referencesUsed: blocks.length,
    });
  } catch (e) {
    console.error("saveChatLog", e);
  }

  return NextResponse.json({
    transcribed: currentText,
    summary,
    suggestions,
    referencesUsed: blocks.length,
  });
}
