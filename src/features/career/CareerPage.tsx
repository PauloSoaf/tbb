import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/workspace";
import { loadCareer } from "./queries";
import { CareerWorkspace } from "./CareerWorkspace";
import "./career.css";
export async function CareerPage({
  section = "overview",
  query = {},
}: {
  section?: string;
  query?: Record<string, string | undefined>;
}) {
  if (
    ![
      "overview",
      "applications",
      "calendar",
      "resumes",
      "pitch",
      "links",
      "statistics",
      "companies",
      "contacts",
      "documents",
      "interviews",
    ].includes(section)
  )
    notFound();
  const ctx = await requirePermission("READ");
  let canWrite = false;
  try {
    await requirePermission("WRITE");
    canWrite = true;
  } catch (e) {
    if (!(e instanceof AuthorizationError)) throw e;
  }
  const data = await loadCareer(
    prisma,
    ctx.workspaceId,
    ctx.userId,
    ctx.workspace.timezone,
    query,
  );
  return <CareerWorkspace data={data} section={section} canWrite={canWrite} />;
}
