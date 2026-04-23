import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  // Evita avisos si hay otro lockfile en el home
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
