import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { countEntries } from "@/lib/rag";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const s = await countEntries();
  return NextResponse.json(s);
}
