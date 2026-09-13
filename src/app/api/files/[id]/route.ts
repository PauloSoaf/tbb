import { readTrackedFile } from "@/lib/storage/tracked-upload";
import { getCurrentTenantContext } from "@/lib/workspace";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentTenantContext()) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;
  try {
    const { file, bytes } = await readTrackedFile(id);
    return new Response(Buffer.from(bytes), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new Response("Arquivo não encontrado", { status: 404 }); }
}
