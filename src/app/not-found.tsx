import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="mb-4 border-2 border-[#FFED4E] bg-black px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
        404
      </p>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">No encontrado</h1>
      <p className="mt-3 max-w-sm text-sm font-light uppercase tracking-wider text-gray-400">Esa ruta no existe.</p>
      <Link
        href="/"
        className="mt-8 border-2 border-white bg-white px-8 py-3 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-gray-200"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
