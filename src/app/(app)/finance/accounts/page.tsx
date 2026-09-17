import { Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/ui/ActionForm";
import { AccountForm, CategoryForm } from "@/features/finance/forms";
import { archiveFinanceEntity, createDefaultCategories } from "@/features/finance/actions";
import { financeSummary } from "@/features/finance/queries";
import { money } from "@/features/finance/money";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { isUnassignedAccount } from "@/features/finance/unassigned-account";

export default async function AccountsPage(){const c=await getWorkspaceContext();const [s,categories]=await Promise.all([financeSummary(c.workspaceId,dayKey(new Date(),c.workspace.timezone)),prisma.financeCategory.findMany({where:{workspaceId:c.workspaceId,isArchived:false},orderBy:[{type:"asc"},{name:"asc"}]})]);return <div className="stack"><PageHeader eyebrow="MONEY · ACCOUNTS" title="Onde seu dinheiro vive." description="Saldos são derivados do saldo inicial e dos lançamentos."><Modal title="Criar conta" trigger={<><Plus size={15}/>Nova conta</>}><AccountForm/></Modal></PageHeader><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{s.accounts.map(a=>{
    const unassigned=isUnassignedAccount(a);
    const card=a.type==="CREDIT_CARD";
    const invoiceCents=card?Math.max(0,-a.balanceCents):0;
    const limitCents=a.creditLimitCents||0;
    const usage=card&&limitCents?Math.min(100,Math.round(invoiceCents/limitCents*100)):null;
    const actions=!unassigned&&<div className="row"><Modal title="Editar conta" trigger="Editar"><AccountForm account={a}/></Modal><ActionForm action={archiveFinanceEntity}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="entity" value="ACCOUNT"/><button className="button-secondary">Arquivar</button></ActionForm></div>;
    if(card)return <article className="panel stack account-card-panel" key={a.id}>
      <div className="row justify-between"><span className="badge">CARTÃO DE CRÉDITO</span><span className="muted text-xs">{a.closingDay?`Fecha dia ${a.closingDay}`:"Fechamento não informado"}{a.dueDay?` · Vence dia ${a.dueDay}`:""}</span></div>
      <div><h2>{a.name}</h2><p className="muted">{a.institution||"Sem instituição"}</p></div>
      <div className="account-card-invoice"><div><small>Fatura atual</small><strong>{money(invoiceCents)}</strong></div><div><small>Disponível</small><strong>{limitCents?money(Math.max(0,limitCents-invoiceCents)):"—"}</strong></div><div><small>Limite</small><strong>{limitCents?money(limitCents):"Não informado"}</strong></div></div>
      <div className="account-card-usage"><span className="finance-credit-progress" data-danger={(usage||0)>=90||undefined}><i style={{width:`${usage||0}%`}}/></span><small className="muted">{usage===null?"Informe o limite para acompanhar o uso":`${usage}% do limite usado`}</small></div>
      {actions}
    </article>;
    return <article className="panel stack" key={a.id}><div className="row justify-between"><span className="badge">{unassigned?"AUTOMÁTICA":a.type}</span><strong>{unassigned?"—":money(a.balanceCents)}</strong></div><div><h2>{a.name}</h2><p className="muted">{unassigned?"Transações aguardando vínculo":a.institution||"Sem instituição"}</p></div>{actions}</article>;
  })}{!s.accounts.length&&<div className="panel"><EmptyState title="Crie sua primeira conta" description="Ela será a origem dos seus lançamentos e importações."/></div>}</div><section className="panel stack"><div className="row justify-between"><div><h2>Categorias</h2><p className="muted">Personalize classificação e regras.</p></div><div className="row"><Modal title="Criar categoria" trigger="Nova categoria"><CategoryForm categories={categories}/></Modal>{!categories.length&&<ActionForm action={createDefaultCategories}><button className="button-secondary">Adicionar categorias iniciais</button></ActionForm>}</div></div><div className="row">{categories.map(category=><span className="badge" key={category.id} style={{borderColor:category.color}}>{category.name} · {category.type}</span>)}</div></section></div>}
