import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { HomeClient } from "./HomeClient";

/**
 * Sin sesión no se renderiza el asistente: redirección en servidor
 * (sin HTML de “sugerencias” / sin fetch de stats hasta post-login).
 */
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return <HomeClient />;
}
