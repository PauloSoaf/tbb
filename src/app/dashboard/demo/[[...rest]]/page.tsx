import { redirect } from "next/navigation";

// Demo bridge — real components render links as /dashboard/{tenant}/... with
// tenant="demo". This static segment wins over /dashboard/[tenant], runs NO
// auth, and bounces the visitor back into the demo tree, so every real
// sidebar/card/button link keeps working inside the demo. Query strings are
// preserved (the agenda view/offset navigation depends on them).

export default async function DashboardDemoBridge({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rest = [] } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";

  // Multi-segment routes with a demo equivalent
  if (rest[0] === "pacientes" && rest.length >= 2) {
    const patientId = rest[1];
    const sub = rest[2];
    if (sub === "avaliacoes" || sub === "planos") {
      redirect(`/demo/dashboard/pacientes/${patientId}/${sub}${suffix}`);
    }
    redirect(`/demo/dashboard/pacientes/${patientId}${suffix}`);
  }
  if (rest[0] === "ferramentas" && rest[1] === "oficina-planos") {
    redirect(`/demo/dashboard/ferramentas/oficina-planos${suffix}`);
  }
  if (rest[0] === "atendimentos" && rest[1] === "novo") {
    redirect(`/demo/dashboard/atendimentos/novo${suffix}`);
  }

  const KNOWN = new Set(["", "pacientes", "agenda", "atendimentos", "ferramentas", "config"]);
  if (KNOWN.has(rest[0] ?? "")) {
    redirect(`/demo/dashboard${rest[0] ? `/${rest[0]}` : ""}${suffix}`);
  }

  // Any real-app route without a demo equivalent lands on the demo home.
  redirect("/demo/dashboard");
}
