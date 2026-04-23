import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Falta OPENAI_API_KEY en el entorno.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const t = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: t,
  });
  return res.data[0].embedding;
}

const ILEGIBLE = "[ilegible]";

/** Misma lógica visual: izquierda = cliente, derecha = vendedor. */
const SYSTEM_SUGGEST_SCREENSHOT = `Eres un extractor fiel. En capturas de chat (Instagram, WhatsApp, etc.):
- A menudo el **cliente** está a la **izquierda** o en burbujas alineadas a un lado, y el **vendedor** a la **derecha** (o al revés según la app). Usa la posición y el contexto.
Transcribe toda la conversación en orden cronológico. Cada mensaje: línea(s) con prefijo **Cliente:** o **Vendedor:** (Nosotros/estudio = Vendedor).
No inventes. Si no se lee, responde solo: ${ILEGIBLE}`;

export async function extractTextFromImageBase64(
  base64: string,
  mime: string
): Promise<string> {
  const openai = getOpenAI();
  const dataUrl = `data:${mime};base64,${base64}`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2000,
    messages: [
      { role: "system", content: SYSTEM_SUGGEST_SCREENSHOT },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe esta conversación (cliente a la izquierda, vendedor a la derecha cuando aplique)." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** Entrenar: forzar convención explícita izq./der. para imágenes subidas al panel. */
const SYSTEM_TRAINING_IMAGES = `Eres un extractor fiel. El usuario sube **capturas de conversaciones de venta**.

Regla estricta de disposición en pantalla (típico de Instagram, WhatsApp, Facebook Messenger, iMessage, etc.):
- Lo que en la imagen se muestra a la **IZQUIERDA** o en la columna/burbuja del lado **izquierdo** es, salvo señal contraria clara, el **CLIENTE**.
- Lo que se muestra a la **DERECHA** o al lado **derecho** es el **VENDEDOR** (el estudio, tú, el artista, "nosotros").

Transcribe **todo** el texto de mensajes visibles, en **orden cronológico** (arriba → abajo, o el orden en que se lee el hilo).
Cada mensaje, en una o más líneas, con un prefijo exactamente así:
  Cliente: (texto)
  o
  Vendedor: (texto)

Si hay varias capturas en la misma sesión, solo transcribe la actual. No inventes mensajes. No resumas. Si un mensaje no es legible, indica: [ilegible parcial] en lugar de inventar.
Si la imagen no tiene conversación legible, responde exactamente: ${ILEGIBLE}`;

export async function extractTrainingTextFromImageBase64(
  base64: string,
  mime: string
): Promise<string> {
  const openai = getOpenAI();
  const dataUrl = `data:${mime};base64,${base64}`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM_TRAINING_IMAGES },
      {
        role: "user",
        content: [
          { type: "text", text: "Extrae el chat de esta captura (izquierda = cliente, derecha = vendedor)." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

export async function extractManyTrainingImages(
  files: { base64: string; mime: string }[]
): Promise<string> {
  const out: string[] = [];
  for (const f of files) {
    const t = (await extractTrainingTextFromImageBase64(f.base64, f.mime)).trim();
    if (t === ILEGIBLE) continue;
    if (t.length) out.push(t);
  }
  return out.join("\n\n---\n\n");
}

export async function suggestReplies(
  contextBlocks: { text: string; kind: string; channel: string | null; title: string | null }[],
  currentConversation: string,
  artistContext?: string
): Promise<{ summary: string; suggestions: { text: string; reasoning?: string }[] }> {
  const openai = getOpenAI();
  const context = contextBlocks
    .map(
      (b, i) =>
        `--- Referencia ${i + 1} (tipo: ${b.kind}, canal: ${b.channel ?? "cualquiera"})${b.title ? ` — ${b.title}` : ""} ---\n${b.text}`
    )
    .join("\n\n");

  const ac = artistContext?.replace(/\s+/g, " ").trim().slice(0, 4000) ?? "";
  const artistBlock =
    ac.length > 0
      ? `PREFERENCIAS / CONTEXTO DEL ARTISTA (cómo este artista se presenta, estilo, reglas, límites de cita, etc.):\n\n${ac}\n\n---\n\n`
      : "";

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres asistente de ventas para un equipo de artistas (Instagram, WhatsApp).
Basándote ÚNICAMENTE en el estilo y las situaciones de las "Referencias" (conversaciones con venta real o vendedores expertos), propón respuestas útiles.
Si hay "Contexto del artista", alinea el tono y no contradigas reglas o límites que allí se indiquen, sin prometer nada no cubierto por el contexto.
No prometas envíos o precios concretos si no aparecen en el contexto o las referencias. Tono: cercano, profesional, claro, sin ser agresivo.
Idioma: español. Devuelve SOLO JSON con esta forma:
{"resumenSituacion":"1-2 frases","sugerencias":[{"texto":"mensaje listo para copiar y pegar","nota":"opcional: por qué encaja o qué cuidar"}]}`,
      },
      {
        role: "user",
        content: `REFERENCIAS (fragmentos reales con los que se entrenó el sistema):

${context || "[Aún no hay referencias; indica al usuario que cargue conversaciones de entrenamiento.]"}

---

${artistBlock}CONVERSACIÓN ACTUAL (el artista pide qué contestar ahora):

${currentConversation}`,
      },
    ],
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(raw) as {
      resumenSituacion?: string;
      sugerencias?: { texto?: string; nota?: string }[];
    };
    const summary = String(parsed.resumenSituacion ?? "");
    const suggestions = (parsed.sugerencias ?? [])
      .filter((s) => s.texto && String(s.texto).trim())
      .map((s) => ({ text: String(s.texto).trim(), reasoning: s.nota ? String(s.nota) : undefined }));
    return { summary, suggestions: suggestions.length ? suggestions : [{ text: "No pude generar sugerencias; revisa las referencias de entrenamiento o la transcripción de la imagen." }] };
  } catch {
    return {
      summary: "",
      suggestions: [{ text: "Error al analizar la respuesta del modelo. Vuelve a intentar." }],
    };
  }
}
