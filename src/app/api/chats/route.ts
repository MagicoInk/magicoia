import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { listChatsForArtist } from "@/lib/artistsStore";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const n = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(80, Math.max(1, n ? parseInt(n, 10) || 50 : 50));
  const list = await listChatsForArtist(session.user.id, limit);
  return NextResponse.json({ items: list });
}
