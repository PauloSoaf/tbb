import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { buildInsights } from "@/features/insights/engine";
import { dayKey } from "@/lib/dates";
import { getWorkspaceContext } from "@/lib/workspace";
export default async function InsightsPage(){const c=await getWorkspaceContext();const insights=await buildInsights(c.workspaceId,dayKey(new Date(),c.workspace.timezone));return <div className="stack"><PageHeader eyebrow="INSIGHTS" title="Sinais claros para decidir melhor." description="Regras determinísticas explicam cada insight com dados do seu workspace."/><div className="grid gap-4 md:grid-cols-2">{insights.map(i=><Link href={i.href} className="panel insight-card" data-tone={i.tone} key={i.id}><span className="badge">{i.module}</span><h2>{i.title}</h2><p className="muted">{i.detail}</p><span className="text-primary">Ver contexto →</span></Link>)}{!insights.length&&<div className="panel md:col-span-2"><EmptyState title="Seus padrões aparecerão aqui" description="Registre hábitos, tarefas, finanças e carreira para receber leituras explicáveis."/></div>}</div></div>}
