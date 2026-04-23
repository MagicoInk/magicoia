import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { authOptions } from "@/lib/authOptions";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MÁGICO — Asistente de ventas",
  description: "Herramienta interna: sugerencias basadas en conversaciones con venta y vendedores referencia.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <body className={`${inter.className} font-sans antialiased`}>
        <Providers session={session}>
          <AppShell cormorantClassName={cormorant.className}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
