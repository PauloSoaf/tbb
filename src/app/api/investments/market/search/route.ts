import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { getCryptoProvider } from "@/features/investments/providers";

export async function GET(request: NextRequest) {
  await getWorkspaceContext();
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await getCryptoProvider().search?.(query);
    return NextResponse.json({ results: results || [] });
  } catch {
    return NextResponse.json({ results: [], stale: true, message: "O provider está indisponível. Você ainda pode cadastrar o ativo manualmente." });
  }
}
