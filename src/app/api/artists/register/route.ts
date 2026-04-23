import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createArtist } from "@/lib/artistsStore";
import { requireAdminSecret } from "@/lib/adminSecret";

const bodySchema = z.object({
  username: z
    .string()
    .min(2, "Usuario mínimo 2 caracteres")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, . _ y -"),
  password: z.string().min(8, "Contraseña mínimo 8 caracteres").max(128),
  displayName: z.string().min(1).max(80).optional(),
});

/**
 * Solo **admin** (misma clave que entrenamiento: `x-admin-secret` = `ADMIN_SECRET`).
 * No hay registro público; las cuentas se crean desde /admin o vía API con clave.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] ?? "Datos no válidos" },
      { status: 400 }
    );
  }

  const { username, password, displayName } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { id } = await createArtist({
      username: username.toLowerCase(),
      passwordHash,
      displayName: (displayName ?? username).trim(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear";
    if (msg.includes("ya existe")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
