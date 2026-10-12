import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("READ");
    if (ctx.role !== "OWNER") return new Response("Não encontrado", { status: 404 });
    const { id } = await params;
    const source = await prisma.financialSource.findFirst({ where: { id, workspaceId: ctx.workspaceId }, select: { content: true, fileName: true, mediaType: true } });
    if (!source) return new Response("Não encontrado", { status: 404 });
    const inline = ["image/png", "image/jpeg", "application/pdf"].includes(source.mediaType);
    return new Response(new Uint8Array(source.content), { headers: { "Content-Type": source.mediaType, "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(source.fileName)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'", "Referrer-Policy": "no-referrer" } });
  } catch { return new Response("Não encontrado", { status: 404 }); }
}
