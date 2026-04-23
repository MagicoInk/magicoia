import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/authOptions";
import { ARTISTS_COL, getArtistById, updateArtistContext } from "@/lib/artistsStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const art = await getArtistById(session.user.id);
  if (!art) {
    return NextResponse.json({ error: "Artista no encontrado" }, { status: 404 });
  }
  return NextResponse.json({
    id: art.id,
    username: art.data.username,
    displayName: art.data.displayName,
    agentContext: art.data.agentContext ?? "",
  });
}

const patchSchema = z.object({
  agentContext: z.string().max(8000).optional(),
  displayName: z.string().min(1).max(80).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }
  if (parsed.data.agentContext === undefined && parsed.data.displayName === undefined) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }
  const art = await getArtistById(session.user.id);
  if (!art) {
    return NextResponse.json({ error: "Artista no encontrado" }, { status: 404 });
  }
  if (parsed.data.agentContext !== undefined) {
    await updateArtistContext(session.user.id, parsed.data.agentContext);
  }
  if (parsed.data.displayName !== undefined) {
    const { getDb } = await import("@/lib/firebaseAdmin");
    const { FieldValue } = await import("firebase-admin/firestore");
    await getDb()
      .collection(ARTISTS_COL)
      .doc(session.user.id)
      .update({
        displayName: parsed.data.displayName,
        updatedAt: FieldValue.serverTimestamp(),
      });
  }
  const after = await getArtistById(session.user.id);
  if (!after) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({
    id: after.id,
    username: after.data.username,
    displayName: after.data.displayName,
    agentContext: after.data.agentContext ?? "",
  });
}
