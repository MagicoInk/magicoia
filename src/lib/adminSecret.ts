import { NextRequest, NextResponse } from "next/server";

/** Valida `x-admin-secret` frente a `ADMIN_SECRET`. Devuelve `null` si OK, o `NextResponse` con error. */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  const provided = request.headers.get("x-admin-secret");
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Falta ADMIN_SECRET en el servidor." },
      { status: 500 }
    );
  }
  if (provided !== secret) {
    return NextResponse.json(
      { error: "Clave de administración incorrecta." },
      { status: 401 }
    );
  }
  return null;
}
