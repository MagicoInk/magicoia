"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { IconMessage, IconImage, IconCopy } from "@/components/icons";
import { GridBackground } from "@/components/GridBackground";

type Stats = { entries: number; chunks: number };

type SuggestResponse = {
  transcribed?: string;
  summary: string;
  suggestions: { text: string; reasoning?: string }[];
  referencesUsed: number;
  error?: string;
  stats?: Stats;
};

export function HomeClient() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<SuggestResponse | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({ entries: 0, chunks: 0 }));
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  function copyToClipboard(index: number, t: string) {
    void navigator.clipboard.writeText(t);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") return;
    setRes(null);
    if (!text.trim() && !file) {
      setRes({
        error: "Pega la conversación o sube una captura (o ambas).",
        summary: "",
        suggestions: [],
        referencesUsed: 0,
      });
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      if (file) form.append("image", file);
      const r = await fetch("/api/suggest", { method: "POST", body: form, credentials: "include" });
      const j = (await r.json()) as SuggestResponse & { error?: string; stats?: Stats };
      if (r.status === 401) {
        setRes({
          error: "Sesión caducada o no iniciada. Vuelve a entrar con tu usuario.",
          summary: "",
          suggestions: [],
          referencesUsed: 0,
        });
        return;
      }
      if (!r.ok) {
        setRes({
          error: j.error || "Error al sugerir",
          summary: "",
          suggestions: [],
          referencesUsed: 0,
          stats: j.stats,
        });
        return;
      }
      setRes(j);
    } catch {
      setRes({
        error: "Error de red. Vuelve a intentar.",
        summary: "",
        suggestions: [],
        referencesUsed: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" aria-live="polite" aria-busy>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Cargando asistente…</p>
        <div className="h-0.5 w-40 overflow-hidden border border-white/30 bg-white/5">
          <div className="h-full w-1/3 animate-pulse bg-[#FFED4E]" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative overflow-hidden">
        <GridBackground className="absolute inset-0 z-0 opacity-30" />
        <div className="relative z-10">
          <div className="mb-6">
            <span className="magico-label-cdmx">
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-white">Equipo</span>
            </span>
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl md:text-6xl">
            Qué le digo
          </h1>
          <h2 className="mt-1 text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl md:text-6xl">
            ahora
          </h2>

          <div className="mb-8 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="magico-line-yellow shrink-0" />
            <p className="max-w-lg text-sm font-light uppercase leading-tight tracking-wider text-white sm:text-base">
              Pega el chat o una captura. Respuestas alineadas con ventas reales y vuestros mejores cierres.
            </p>
          </div>

          {stats && (
            <div className="mb-2 flex flex-wrap items-center gap-4 text-sm sm:gap-8">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white sm:text-4xl">{stats.entries}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">historias</span>
              </div>
              <div className="h-8 w-0.5 bg-gray-700" />
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white sm:text-4xl">{stats.chunks}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">fragmentos</span>
              </div>
              {stats.chunks < 1 && (
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFED4E]">Entrenar primero</span>
              )}
            </div>
          )}
        </div>
      </section>

      <form onSubmit={onSubmit} className="magico-card space-y-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white">
          <span className="border-2 border-white p-1.5 text-[#FFED4E]">
            <IconMessage className="h-4 w-4" />
          </span>
          Conversación
        </h2>
        <div>
          <label htmlFor="t" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Texto del chat
          </label>
          <p className="mb-2 text-xs text-gray-500">Opcional si subes solo imagen clara.</p>
          <textarea
            id="t"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cliente: Hola, el diseño de la web…"
            className="magico-input min-h-[120px] resize-y"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Captura</label>
          <div className="border-2 border-dashed border-white/30 bg-black/50 px-4 py-6 text-center">
            <IconImage className="mx-auto mb-2 h-8 w-8 text-gray-500" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer text-sm file:mx-auto file:cursor-pointer file:border-2 file:border-white file:bg-white file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-black hover:file:bg-gray-200"
            />
            {file ? (
              <p className="mt-2 truncate text-xs text-gray-400" title={file.name}>
                {file.name}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">JPG, PNG, WebP, GIF</p>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={loading ? "magico-btn-primary magico-loading-bar" : "magico-btn-primary"}
        >
          {loading ? "Analizando…" : "Generar sugerencias"}
        </button>
      </form>

      {res && (
        <section className="space-y-5" aria-live="polite">
          {res.error && (
            <div className="border-2 border-[#FFED4E] bg-black px-4 py-3 text-sm text-white" role="alert">
              {res.error}{" "}
              {res.error.toLowerCase().includes("sesión") && (
                <Link href="/login" className="ml-1 font-bold underline text-[#FFED4E]">
                  Iniciar sesión
                </Link>
              )}
            </div>
          )}

          {res.transcribed && (
            <div className="magico-card p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Lectura del chat</h3>
              <pre className="mt-3 max-h-52 overflow-auto border-2 border-white/20 bg-black p-3 text-xs leading-relaxed text-gray-200 [scrollbar-width:thin]">
                {res.transcribed}
              </pre>
            </div>
          )}

          {res.summary && (
            <div className="magico-card p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Situación</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-white sm:text-base">{res.summary}</p>
            </div>
          )}

          {res.suggestions?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="magico-section-title text-lg sm:text-xl">Sugerencias</h3>
                {typeof res.referencesUsed === "number" && (
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {res.referencesUsed} refs
                  </span>
                )}
              </div>
              <ol className="space-y-4">
                {res.suggestions.map((s, i) => (
                  <li key={i} className="border-2 border-white bg-black/50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#FFED4E] text-sm font-black text-[#FFED4E]">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-white sm:text-base">
                        {s.text}
                      </p>
                    </div>
                    {s.reasoning && <p className="mt-2 pl-11 text-xs text-gray-500">{s.reasoning}</p>}
                    <div className="mt-3 pl-11">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(i, s.text)}
                        className="magico-btn-ghost w-auto !py-2 text-[10px]"
                      >
                        <IconCopy className="h-3.5 w-3.5" />
                        {copied === i ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
