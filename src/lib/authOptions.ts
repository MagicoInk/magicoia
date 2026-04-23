import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getArtistByUsername } from "./artistsStore";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const a = await getArtistByUsername(String(credentials.username));
        if (!a) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          a.data.passwordHash
        );
        if (!ok) return null;
        return {
          id: a.id,
          name: a.data.displayName || a.data.username,
          email: `${a.data.username}@artist.local`,
          image: null,
          username: a.data.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; username?: string; email?: string | null };
        token.id = u.id;
        if (u.username) token.username = u.username;
        if (!token.username && u.email) {
          const m = u.email.replace(/@artist\.local$/, "");
          if (m) token.username = m;
        }
      }
      if (!token.username && token.id) {
        const { getArtistById } = await import("./artistsStore");
        const art = await getArtistById(String(token.id));
        if (art) token.username = art.data.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; username: string }).id = String(
          token.id
        );
        (session.user as { id: string; username: string }).username = String(
          token.username || ""
        );
        session.user.email = session.user.email || `${token.username}@artist.local`;
        session.user.name = session.user.name || String(token.name || token.username);
      }
      return session;
    },
  },
};
