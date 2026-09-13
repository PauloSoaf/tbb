import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { storageUsageService } from "@/services/storageUsage.service";
import { FileDeleteForm, FileUploadForm } from "./FileForm";
export async function StoragePanel() {
  const ctx = await getWorkspaceContext();
  const [files, usage] = await Promise.all([
    prisma.storageFile.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
    storageUsageService.getUsage(ctx.workspaceId),
  ]);
  return <section className="panel stack"><h2>Arquivos do espaço</h2><p className="muted">{usage.fileCount} arquivos · {(usage.usedBytes / 1048576).toFixed(2)} MB usados</p>
    {ctx.role !== "VIEWER" && <FileUploadForm maxBytes={usage.operationalLimits.single} />}
    {files.length === 0 && <p className="empty-state">Os arquivos que você adicionar aparecerão aqui.</p>}
    {files.map(file => <div key={file.id} className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}><a href={`/api/files/${file.id}`} download>{file.originalName}</a><small className="muted">{(file.sizeBytes / 1024).toFixed(1)} KB</small>{ctx.role !== "VIEWER" && <FileDeleteForm id={file.id} />}</div>)}
  </section>;
}
