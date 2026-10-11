"use server";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { financeOverview } from "./overview-query";
import { cardStatementRows } from "./queries";
import { buildFinancialReport } from "./financial-report";
const day=(value:Date|null)=>value?.toISOString().slice(0,10)||null;
export async function exportFinancialReport(){
  const ctx=await requirePermission("READ");
  if(ctx.role!=="OWNER")return {error:"O relatório completo, incluindo faturas privadas, está disponível somente ao titular."};
  const today=dayKey(new Date(),ctx.workspace.timezone);
  const [overview,statements,transactions,debts,subscriptions,goals,investments]=await Promise.all([
    financeOverview(ctx.workspaceId,today,{statementViewer:ctx}),cardStatementRows(ctx),
    prisma.financeTransaction.findMany({where:{workspaceId:ctx.workspaceId},include:{account:{select:{name:true}},destinationAccount:{select:{name:true}},category:{select:{name:true}}},orderBy:[{date:"asc"},{id:"asc"}]}),
    prisma.debt.findMany({where:{workspaceId:ctx.workspaceId},orderBy:{name:"asc"}}),
    prisma.subscription.findMany({where:{workspaceId:ctx.workspaceId},include:{account:{select:{name:true}}},orderBy:{name:"asc"}}),
    prisma.savingsGoal.findMany({where:{workspaceId:ctx.workspaceId},orderBy:{name:"asc"}}),
    prisma.investmentPosition.findMany({where:{workspaceId:ctx.workspaceId,account:{archivedAt:null},asset:{archivedAt:null}},include:{asset:{select:{name:true}},account:{select:{name:true}}},orderBy:{id:"asc"}}),
  ]);
  return {report:buildFinancialReport(overview,{
    statements:statements.sort((a,b)=>(a.dueDate||a.referenceMonth||"").localeCompare(b.dueDate||b.referenceMonth||"")),
    transactions:transactions.map((t)=>({...t,date:day(t.date)!,account:t.account.name,destination:t.destinationAccount?.name||null,category:t.category?.name||null})),
    debts:debts.map((d)=>({...d,targetPayoffDate:day(d.targetPayoffDate)})),
    subscriptions:subscriptions.map((s)=>({...s,nextChargeDate:day(s.nextChargeDate)!,account:s.account?.name||null})),
    goals:goals.map((g)=>({...g,targetDate:day(g.targetDate)})),
    investments:investments.map((i)=>({name:i.asset.name,account:i.account.name,currentValueCents:i.currentValueCents,bookCostCents:i.bookCostCents})),
  })};
}
