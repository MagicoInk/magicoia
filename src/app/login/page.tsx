"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GridBackground } from "@/components/GridBackground";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      callbackUrl: "/",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    if (res?.ok) {
      router.push(res.url ?? "/");
      router.refresh();
    }
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden">
        <GridBackground className="absolute inset-0 z-0 opacity-30" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
            Entrar
          </h1>
          <p className="mt-3 text-sm font-light uppercase tracking-wider text-gray-400">
            Cuenta de artista
          </p>
        </div>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="magico-card space-y-4 p-5 sm:p-6">
        {error && (
          <p className="text-sm text-[#FFED4E]" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="u" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Usuario
          </label>
          <input
            id="u"
            className="magico-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="p" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Contraseña
          </label>
          <input
            id="p"
            type="password"
            className="magico-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={loading ? "magico-btn-primary magico-loading-bar" : "magico-btn-primary"}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-center text-xs text-gray-500">
          Las credenciales las asigna el estudio. Si no tenés acceso, contacta a tu contacto.
        </p>
      </form>
    </div>
  );
}
