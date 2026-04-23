"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function NavUser() {
  const { data, status } = useSession();
  if (status === "loading") {
    return <span className="text-xs font-bold uppercase tracking-widest text-gray-500">…</span>;
  }
  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-[#FFED4E]"
      >
        Entrar
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Link
        href="/cuenta"
        className="max-w-[140px] truncate text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-[#FFED4E] sm:max-w-none"
        title={data.user.name ?? data.user.username}
      >
        {data.user.name ?? data.user.username}
      </Link>
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/login" })}
        className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-white"
      >
        Salir
      </button>
    </div>
  );
}
