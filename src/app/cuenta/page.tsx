"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { GridBackground } from "@/components/GridBackground";

type Profile = { username: string; displayName: string; agentContext: string };

type ChatItem = {
  id: string;
  inputPreview: string;
  summary: string;
  transcribed: string;
  suggestions: { text: string; reasoning?: string }[];
  referencesUsed: number;
  createdAt: string;
};

export default function CuentaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chats, setChats] = useState<ChatItem[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ctx, setCtx] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let c = true;
    void (async () => {
      const r = await fetch("/api/artists/me");
      if (!c) return;
      if (r.status === 401) {
        setLoadErr("Sesión requerida.");
        return;
      }
      if (!r.ok) {
        setLoadErr("No se pudo cargar el perfil.");
        return;
      }
      const p = (await r.json()) as Profile;
      setProfile(p);
      setCtx(p.agentContext);
      setName(p.displayName);
    })();
    return () => {
      c = false;
    };
  }, []);

  useEffect(() => {
    let c = true;
    void (async () => {
      const r = await fetch("/api/chats?limit=40");
      if (!c) return;
      if (r.status === 401) return;
      if (!r.ok) return;
      const j = (await r.json()) as { items: ChatItem[] };
      setChats(j.items);
    })();
    return () => {
      c = false;
    };
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLoadErr(null);
    const r = await fetch("/api/artists/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentContext: ctx,
        displayName: name.trim() || profile?.username,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as Profile & { error?: string };
    if (!r.ok) {
      setLoadErr(j.error || "Error al guardar");
      setSaving(false);
      return;
    }
    if (j.username) {
      setProfile({
        username: j.username,
        displayName: j.displayName,
        agentContext: j.agentContext,
      });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden">
        <GridBackground className="absolute inset-0 z-0 opacity-30" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">Tu cuenta</h1>
          <p className="mt-3 text-sm font-light uppercase tracking-wider text-gray-400">
            Contexto para el agente e historial de búsquedas
          </p>
        </div>
      </section>

      {loadErr && (
        <p className="text-sm text-[#FFED4E]" role="alert">
          {loadErr}
        </p>
      )}

      {profile && (
        <form onSubmit={(e) => void saveProfile(e)} className="magico-card space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Perfil</h2>
          <div>
            <span className="text-xs text-gray-500">Usuario: </span>
            <span className="text-sm text-white">{profile.username}</span>
          </div>
          <div>
            <label htmlFor="n" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Nombre en pantalla
            </label>
            <input id="n" className="magico-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="c" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Contexto del agente
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Cómo te presentas, qué ofrece el estudio, cómo se citan, colores, límites (sin inventar
              ofertas). Se usa al generar sugerencias.
            </p>
            <textarea
              id="c"
              rows={8}
              className="magico-input min-h-[160px] resize-y"
              value={ctx}
              onChange={(e) => setCtx(e.target.value)}
              maxLength={8000}
            />
            <p className="mt-1 text-right text-xs text-gray-500">{ctx.length} / 8000</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className={saving ? "magico-btn-primary magico-loading-bar" : "magico-btn-primary"}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Historial de chats</h2>
        {chats === null && <p className="text-sm text-gray-500">Cargando…</p>}
        {chats?.length === 0 && <p className="text-sm text-gray-500">Aún no hay búsquedas guardadas.</p>}
        {chats && chats.length > 0 && (
          <ul className="space-y-3">
            {chats.map((c) => (
              <li key={c.id} className="magico-card p-4">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-gray-500">
                  <time dateTime={c.createdAt} className="font-mono">
                    {new Date(c.createdAt).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                  <span>
                    {c.referencesUsed} ref{c.referencesUsed === 1 ? "" : "s"}
                  </span>
                </div>
                {c.summary && <p className="text-sm text-white">{c.summary}</p>}
                {c.inputPreview && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400" title={c.transcribed}>
                    {c.inputPreview}
                    {c.transcribed.length > c.inputPreview.length ? "…" : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-500">
          Cada consulta a “Generar sugerencias” se guarda aquí con la situación y un extracto.{" "}
          <Link href="/" className="text-[#FFED4E] hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
