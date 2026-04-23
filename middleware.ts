import { withAuth } from "next-auth/middleware";

/**
 * Solo /login (y recursos) son públicos. Todo lo demás exige sesión.
 * No incluimos /api: las rutas validan con getServerSession y responden 401 JSON
 * (evita redirigir fetch a HTML).
 */
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

export const config = {
  matcher: [
    // Todo excepto: api, next interno, estáticos con extensión, login
    "/((?!api|_next/|_static/|_vercel|favicon|.*\\..*|login).+)",
    "/",
  ],
};
