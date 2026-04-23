"use client";

import { useState, useEffect, type FormEvent } from "react";
import { IconSparkle, IconMessage } from "@/components/icons";
import { GridBackground } from "@/components/GridBackground";

const STORAGE = "ia-magico-admin-secret";

type Entry = {
  id: string;
  title: string | null;
  kind: string;
  channel: string | null;
  createdAt: string;
  _count: { chunks: number };
};

function KindBadge({ kind }: { kind: string }) {
  if (kind === "compra") {
    return (
      <span className="border-2 border-[#FFED4E] bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#FFED4E]">
        Venta
      </span>
    );
  }
  return (
    <span className="border-2 border-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
      Experto
    </span>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [artist, setArtist] = useState({ username: "", displayName: "", password: "" });
  const [artistSaving, setArtistSaving] = useState(false);
  const [artistMsg, setArtistMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    kind: "compra" as "compra" | "experto",
    channel: "" as "" | "instagram" | "whatsapp",
    fullText: "",
  });

  useEffect(() => {
    (async () => {
      let s: string | null = null;
      try {
        s = localStorage.getItem(STORAGE);
        if (s) setSecret(s);
      } catch {
        // ignore
      }
      if (s && s.length >= 4) {
        setLoadErr(null);
        const r = await fetch("/api/training", { headers: { "x-admin-secret": s } });
        if (r.ok) {
          const j = (await r.json()) as { entries: Entry[] };
          setEntries(j.entries);
        } else {
          setEntries([]);
        }
      }
    })();
  }, []);

  function saveSecret() {
    try {
      localStorage.setItem(STORAGE, secret);
    } catch {
      // ignore
    }
  }

  async function load() {
    if (secret.length < 4) {
      setLoadErr("Escribe al menos 4 caracteres de clave.");
      return;
    }
    setLoadErr(null);
    const r = await fetch("/api/training", {
      headers: { "x-admin-secret": secret },
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setLoadErr(j.error || `Error ${r.status}`);
      setEntries([]);
      return;
    }
    const j = (await r.json()) as { entries: Entry[] };
    setEntries(j.entries);
  }

  async function readImagesToText() {
    if (secret.length < 4) {
      setLoadErr("Escribe la clave de administración.");
      return;
    }
    if (!imageFiles.length) {
      setLoadErr("Elige al menos una imagen de la conversación.");
      return;
    }
    setExtracting(true);
    setLoadErr(null);
    try {
      const fd = new FormData();
      for (const f of imageFiles) {
        fd.append("images", f);
      }
      const r = await fetch("/api/training/extract", {
        method: "POST",
        headers: { "x-admin-secret": secret },
        body: fd,
      });
      const j = (await r.json()) as { text?: string; error?: string };
      if (!r.ok) {
        setLoadErr(j.error || "Error al leer imágenes");
        return;
      }
      if (j.text) {
        const next = String(j.text);
        setForm((f) => ({
          ...f,
          fullText: f.fullText.trim() ? `${f.fullText.trim()}\n\n${next}` : next,
        }));
      }
    } catch {
      setLoadErr("Error de red al leer imágenes");
    } finally {
      setExtracting(false);
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    saveSecret();
    if (secret.length < 4) {
      setLoadErr("Escribe la clave de administración.");
      return;
    }
    if (form.fullText.trim().length < 20 && imageFiles.length === 0) {
      setLoadErr("Pega o genera con IA al menos 20 caracteres, o sube imágenes y pulsa leer o guardar directamente.");
      return;
    }
    setSaving(true);
    setLoadErr(null);
    try {
      let r: Response;
      if (imageFiles.length) {
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("kind", form.kind);
        fd.append("channel", form.channel);
        fd.append("fullText", form.fullText);
        for (const f of imageFiles) {
          fd.append("images", f);
        }
        r = await fetch("/api/training", { method: "POST", headers: { "x-admin-secret": secret }, body: fd });
      } else {
        r = await fetch("/api/training", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-secret": secret,
          },
          body: JSON.stringify({
            title: form.title || null,
            kind: form.kind,
            channel: form.channel || null,
            fullText: form.fullText,
          }),
        });
      }
      const j = await r.json();
      if (!r.ok) {
        setLoadErr(
          typeof j.error === "string" ? j.error : JSON.stringify(j.error ?? "Error al guardar")
        );
        return;
      }
      setForm((f) => ({ ...f, fullText: "", title: "" }));
      setImageFiles([]);
      await load();
    } catch {
      setLoadErr("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function onCreateArtist(e: FormEvent) {
    e.preventDefault();
    saveSecret();
    setArtistMsg(null);
    if (secret.length < 4) {
      setLoadErr("Escribe la clave de administración.");
      return;
    }
    if (!artist.username.trim() || artist.password.length < 8) {
      setLoadErr("Usuario y contraseña mín. 8 caracteres.");
      return;
    }
    setArtistSaving(true);
    setLoadErr(null);
    try {
      const r = await fetch("/api/artists/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          username: artist.username.trim().toLowerCase(),
          displayName: (artist.displayName || artist.username).trim(),
          password: artist.password,
        }),
      });
      const j = (await r.json()) as { error?: string; id?: string };
      if (!r.ok) {
        setLoadErr(j.error || "Error al crear artista");
        return;
      }
      setArtistMsg("Cuenta creada. Entrega al usuario: usuario, contraseña (cámbiala tras el primer inicio de sesión si aplica).");
      setArtist({ username: "", displayName: "", password: "" });
    } catch {
      setLoadErr("Error de red");
    } finally {
      setArtistSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar esta conversación y todos sus fragmentos?")) return;
    saveSecret();
    const r = await fetch(`/api/training?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    if (!r.ok) {
      setLoadErr("No se pudo eliminar");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative">
        <GridBackground className="absolute inset-0 z-0 opacity-25" />
        <div className="relative z-10">
          <div className="mb-6">
            <span className="magico-label-cdmx">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-white">Entrenar</span>
            </span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl">Memoria</h1>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl">de venta</h2>
          <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="magico-line-yellow shrink-0" />
            <p className="max-w-prose text-sm font-light uppercase leading-tight tracking-wider text-white/95">
              Podés subir <strong className="text-white">capturas</strong>: en el chat, lo de la <strong className="text-white">izquierda</strong> = cliente, lo de
              la <strong className="text-white">derecha</strong> = vendedor. O pegar texto. Se indexa en fragmentos.
            </p>
          </div>
        </div>
      </section>

      <div className="magico-card p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Administración</h2>
        <p className="mt-1 text-xs text-gray-500">
          Clave <code className="border border-white/20 bg-black px-1 font-mono text-white">ADMIN_SECRET</code> en
          servidor. Se guarda en este navegador.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Tu clave"
            className="magico-input sm:flex-1"
          />
          <button
            type="button"
            onClick={() => {
              saveSecret();
              void load();
            }}
            className="magico-btn-ghost shrink-0 sm:w-auto"
          >
            <IconSparkle className="h-3.5 w-3.5 text-[#FFED4E]" />
            Recargar
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Las cuentas de artista no se autoregistran: dales de alta aquí o por API; el acceso a la app es con el usuario y contraseña que crees tú.
        </p>
      </div>

      <form onSubmit={(e) => void onCreateArtist(e)} className="magico-card p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Nuevo artista</h2>
        <p className="mt-1 text-xs text-gray-500">Necesita la clave de administración arriba. La contraseña envías por un canal seguro (no por chat público).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400" htmlFor="a-user">
              Usuario (inicio de sesión)
            </label>
            <input
              id="a-user"
              className="magico-input"
              value={artist.username}
              onChange={(e) => setArtist((a) => ({ ...a, username: e.target.value }))}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400" htmlFor="a-nombre">
              Nombre visible
            </label>
            <input
              id="a-nombre"
              className="magico-input"
              value={artist.displayName}
              onChange={(e) => setArtist((a) => ({ ...a, displayName: e.target.value }))}
              autoComplete="off"
              placeholder="Mismo que usuario si vacío"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400" htmlFor="a-pw">
            Contraseña inicial
          </label>
          <input
            id="a-pw"
            type="password"
            className="magico-input"
            value={artist.password}
            onChange={(e) => setArtist((a) => ({ ...a, password: e.target.value }))}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {artistMsg && <p className="mt-3 text-xs text-[#FFED4E]">{artistMsg}</p>}
        <button
          type="submit"
          disabled={artistSaving}
          className="magico-btn-primary mt-4 !w-auto"
        >
          {artistSaving ? "Creando…" : "Crear cuenta de artista"}
        </button>
      </form>

      {loadErr && (
        <div className="border-2 border-red-500 bg-black px-4 py-3 text-sm text-red-200">{loadErr}</div>
      )}

      <form onSubmit={onAdd} className="magico-card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
          <span className="border-2 border-[#FFED4E] p-1.5 text-[#FFED4E]">
            <IconMessage className="h-4 w-4" />
          </span>
          Nueva conversación
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Tipo</label>
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as "compra" | "experto" }))}
              className="magico-input"
            >
              <option value="compra">Cliente que compró</option>
              <option value="experto">Vendedor referencia</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Canal</label>
            <select
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({ ...f, channel: e.target.value as "" | "instagram" | "whatsapp" }))
              }
              className="magico-input"
            >
              <option value="">Mixto / cualquiera</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">Nota (opcional)</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="magico-input"
            placeholder="Ej. pieza X, dudas de precio"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Capturas de la conversación
          </label>
          <p className="mb-2 text-[11px] font-medium leading-snug text-gray-500">
            <span className="text-[#FFED4E]">Regla en pantalla:</span> columnas como Instagram/WhatsApp —{" "}
            <span className="text-white">izquierda = cliente</span>, <span className="text-white">derecha = vendedor</span>
            (estudio o artista). Podés subir varias tomas de la misma charla.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              setImageFiles(list);
            }}
            className="block w-full text-xs file:mr-2 file:border-2 file:border-white file:bg-white file:px-3 file:py-1.5 file:font-bold file:uppercase file:tracking-wider file:text-black hover:file:bg-gray-200"
          />
          {imageFiles.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              {imageFiles.length} archivo{imageFiles.length > 1 ? "s" : ""} listo{imageFiles.length > 1 ? "s" : ""}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={extracting || !imageFiles.length || secret.length < 4}
              onClick={() => void readImagesToText()}
              className="magico-btn-ghost w-full !py-2.5 sm:w-auto"
            >
              {extracting ? "Leyendo…" : "Solo leer y rellenar caja (IA)"}
            </button>
            <p className="self-center text-[10px] uppercase tracking-wider text-gray-600 sm:max-w-xs">
              Opcional: rellená el cuadro para revisar antes de indexar, o indexá directo con el botón de abajo.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Texto (pegado o generado arriba)
          </label>
          <textarea
            rows={10}
            value={form.fullText}
            onChange={(e) => setForm((f) => ({ ...f, fullText: e.target.value }))}
            className="magico-input min-h-[200px] resize-y"
            placeholder="Cliente: …\nVendedor: … (o pega; mín. 20 caracteres si no hay imágenes al guardar sin capturas)"
          />
        </div>
        <button
          type="submit"
          disabled={saving || secret.length < 4}
          className={saving ? "magico-btn-primary magico-loading-bar" : "magico-btn-primary"}
        >
          {saving ? "Indexando…" : imageFiles.length ? "Indexar (IA lee imágenes + caja de texto)" : "Añadir e indexar"}
        </button>
      </form>

      <section>
        <h2 className="text-lg font-black uppercase tracking-tighter text-white sm:text-xl">Guardadas</h2>
        {entries.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">Aún no hay entradas o clave no válida.</p>
        )}
        <ul className="mt-4 space-y-3">
          {entries.map((en) => (
            <li key={en.id} className="border-2 border-white/30 bg-black/30 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={en.kind} />
                  <span className="text-sm font-bold text-white">{en.title || "Sin título"}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {en._count.chunks} frags
                  {en.channel ? ` · ${en.channel}` : ""} · {new Date(en.createdAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-gray-600">{en.id}</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(en.id)}
                className="mt-2 border-2 border-red-500/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-300 sm:mt-0 hover:border-red-400 hover:bg-red-950/40"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
