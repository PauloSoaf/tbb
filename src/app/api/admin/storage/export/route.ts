import { NextResponse } from "next/server";
import { requireGlobalAdmin, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { globalAdminService } from "@/services/global-admin.service";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** CSV export of the per-tenant storage table shown in /admin/storage — Global Admin only. */
export async function GET() {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 401;
    return NextResponse.json({ error: "Não autorizado." }, { status });
  }

  const { data } = await globalAdminService.listTenants(undefined, undefined, 1, 1000);

  const header = ["clinica", "slug", "plano", "status_assinatura", "armazenamento_bytes", "limite_mb", "arquivos_pacientes", "membros_equipe", "criado_em"];
  const rows = data.map((t) => [
    t.name,
    t.slug,
    t.planCode,
    t.subscriptionStatus,
    t.storageBytes,
    t.storageLimitMb ?? "",
    t.patientCount,
    t.teamMemberCount,
    t.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutriopus-storage-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
