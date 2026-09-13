import { redirect } from "next/navigation";

// Demo bridge for the patient portal — the real PatientPortalShell builds
// links as /portal/{tenant}/... (and /portal/{tenant}/paciente/{slug}/...,
// which next.config rewrites strip back to /portal/{tenant}/...). With
// tenant="demo" they land here and bounce into the demo tree, auth-free.
const KNOWN = new Set(["cardapio", "evolucao", "diario", "compras", "chat", "agenda"]);

export default async function PortalDemoBridge({
  params,
}: {
  params: Promise<{ rest?: string[] }>;
}) {
  const { rest = [] } = await params;
  // Strip the /paciente/{slug} prefix when the rewrite didn't (direct hits).
  const cleaned = rest[0] === "paciente" ? rest.slice(2) : rest;
  const first = cleaned[0] ?? "";

  if (KNOWN.has(first)) redirect(`/demo/portal/${first}`);
  redirect("/demo/portal");
}
