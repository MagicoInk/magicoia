"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridBackground } from "@/components/GridBackground";
import { NavUser } from "@/components/NavUser";

const RUTAS_SOLO_ACCESO = ["/login"];

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-gray-300"
    >
      {children}
    </Link>
  );
}

type AppShellProps = {
  children: ReactNode;
  cormorantClassName: string;
};

export function AppShell({ children, cormorantClassName }: AppShellProps) {
  const pathname = usePathname() || "";
  const sinChrome = RUTAS_SOLO_ACCESO.some((p) => pathname === p);

  if (sinChrome) {
    return (
      <div className="magico-wrap min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black">
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b-2 border-white bg-black/95 backdrop-blur-xl"
          role="banner"
        >
          <div className="relative h-16">
            <div className="magico-nav-inner flex h-full items-center justify-center sm:justify-center">
              <p
                className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl"
                translate="no"
              >
                MÁGICO <span className="text-white">IA</span>
              </p>
            </div>
          </div>
        </header>
        <div className="relative">
          <GridBackground className="fixed inset-0 z-0 opacity-[0.4]" />
          <main className="relative z-10 magico-container pt-24 pb-20 sm:pt-28 sm:pb-24">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="magico-wrap min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black">
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b-2 border-white bg-black/95 backdrop-blur-xl"
        role="banner"
      >
        <div className="relative h-16">
          <div className="magico-nav-inner relative z-10 flex h-full items-center justify-between">
            <Link href="/" className="group flex items-baseline gap-2" aria-label="Inicio MÁGICO IA">
              <span
                className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl"
                translate="no"
              >
                MÁGICO
              </span>
              <span
                className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl"
                translate="no"
              >
                IA
              </span>
            </Link>
            <nav
              className="flex min-w-0 flex-1 items-center justify-end gap-3 pl-2 sm:gap-6"
              aria-label="Principal"
            >
              <NavLink href="/">Inicio</NavLink>
              <NavLink href="/admin">Entrenar</NavLink>
              <NavUser />
            </nav>
          </div>
        </div>
      </header>

      <div className="relative">
        <GridBackground className="fixed inset-0 z-0 opacity-[0.4]" />
        <main className="relative z-10 magico-container pt-24 pb-20 sm:pt-28 sm:pb-24">{children}</main>
      </div>

      <footer className="relative z-10 border-t-2 border-gray-800 bg-black/80 py-8">
        <div className="magico-container text-center sm:text-left">
          <p
            className={`${cormorantClassName} text-sm font-medium italic text-gray-500`}
          >
            Uso interno Mágico. Las sugerencias son orientativas; el envío final lo decide el artista.
          </p>
        </div>
      </footer>
    </div>
  );
}
