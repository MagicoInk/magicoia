/** Misma lógica que en `paginafinal` — fondo con cuadrícula. */
export function GridBackground({ className = "" }: { className?: string }) {
  const gridColor = "rgba(255, 255, 255, 0.10)";

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(${gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
      aria-hidden
    />
  );
}
