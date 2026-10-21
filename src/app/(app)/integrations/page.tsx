import Link from "next/link";
import { CalendarDays, FileSpreadsheet, Landmark, MessageCircle, Network } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { openFinanceOverview } from "@/features/open-finance/queries";
const providers=[{name:"CSV",description:"Importe extratos com mapeamento, deduplicação e rollback.",status:"Disponível",icon:FileSpreadsheet,href:"/finance/imports"},{name:"PDF",description:"Extrai PDFs textuais para a mesma revisão financeira.",status:"Disponível",icon:FileSpreadsheet,href:"/finance/imports"},{name:"OFX",description:"Parser isolado e formato intermediário já preparados.",status:"Planejado",icon:Landmark},{name:"WhatsApp",description:"Entrada manual futura pelo pipeline Message → Review → Transaction.",status:"Não configurado",icon:MessageCircle},{name:"Calendar",description:"Projeção interna de tarefas, entrevistas e prazos sem duplicar dados.",status:"Interno",icon:CalendarDays,href:"/calendar"},];
async function openFinanceCard(){
  // Honest state: "Conectado" only when a real connection exists and is active.
  const context=await requirePermission("READ");
  const base={name:"Open Finance (Meu Pluggy)",description:"Saldos e movimentos das suas contas pelo Meu Pluggy, gratuito para uso pessoal. Você autoriza cada banco; nada é lançado sem conciliação.",icon:Network,href:"/integrations/open-finance"};
  if(context.role!=="OWNER")return{...base,status:"Somente o titular",href:undefined};
  try{const overview=await openFinanceOverview(prisma,context.workspaceId);const active=overview.connections.filter(c=>c.status==="ACTIVE").length;
    return{...base,status:!overview.ready?"Migração pendente":!overview.configured?"Não configurado":active?`Conectado (${active})`:overview.connections.length?"Requer atenção":"Pronto para conectar"};}
  catch{return{...base,status:"Indisponível"};}
}
export default async function IntegrationsPage(){const all=[...providers,await openFinanceCard()];return <div className="stack"><PageHeader eyebrow="INTEGRATIONS" title="Conecte entradas com controle." description="Nenhum provider externo aparece como conectado sem configuração real."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{all.map(p=><article className="panel stack" key={p.name}><div className="row justify-between"><p.icon size={22}/><span className="badge">{p.status}</span></div><div><h2>{p.name}</h2><p className="muted mt-1">{p.description}</p></div>{p.href?<Link href={p.href} className="button-secondary">Abrir</Link>:<button className="button-secondary" disabled>Em preparação</button>}</article>)}</div></div>}
