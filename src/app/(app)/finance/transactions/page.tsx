import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinanceDataGrid } from "@/features/finance/FinanceDataGrid";
import { FinanceTransactionFilters } from "@/features/finance/FinanceTransactionFilters";
import { transactionWhere, type TransactionSearchParams } from "@/features/finance/transaction-filters";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

type SearchParams=TransactionSearchParams;

export default async function TransactionsPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const context=await getWorkspaceContext();
  const params=await searchParams;
  const page=Math.max(1,Number(params.page)||1);
  const [accounts,categories]=await Promise.all([
    prisma.account.findMany({where:{workspaceId:context.workspaceId,isArchived:false},select:{id:true,name:true},orderBy:{name:"asc"}}),
    prisma.financeCategory.findMany({where:{workspaceId:context.workspaceId,isArchived:false},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);
  const where=transactionWhere(context.workspaceId,params);
  const [transactions,count]=await Promise.all([
    prisma.financeTransaction.findMany({where,orderBy:[{date:"desc"},{createdAt:"desc"}],skip:(page-1)*100,take:100}),
    prisma.financeTransaction.count({where}),
  ]);
  const rows=transactions.filter(transaction=>transaction.type!=="TRANSFER").map(transaction=>({
    id:transaction.id,
    date:transaction.date.toISOString().slice(0,10),
    description:transaction.description,
    merchant:transaction.merchant||"",
    categoryId:transaction.categoryId||"",
    accountId:transaction.accountId,
    type:transaction.type as "INCOME"|"EXPENSE"|"REFUND"|"ADJUSTMENT",
    amount:(transaction.amountCents/100).toFixed(2).replace(".",","),
    tags:transaction.tags.join(", "),
    notes:transaction.notes||"",
    source:transaction.source,
    createdAt:transaction.createdAt.toISOString(),
    updatedAt:transaction.updatedAt.toISOString(),
  }));

  return <FinancePrivacyBoundary><div className="stack">
    <PageHeader eyebrow="DINHEIRO · TRANSAÇÕES" title="Lançamentos inteligentes." description={`${count} lançamento(s). Edite, selecione intervalos, copie e cole como em uma planilha.`}><Link className="button-secondary" href="/finance/imports">Importar arquivo</Link></PageHeader>
    <FinanceTransactionFilters accounts={accounts} categories={categories} current={params}/>
    <FinanceDataGrid initialRows={rows} accounts={accounts} categories={categories} today={dayKey(new Date(),context.workspace.timezone)} timeZone={context.workspace.timezone}/>
    {count>100&&<nav className="row justify-between"><Link className="button-secondary" aria-disabled={page===1} href={{query:{...params,page:Math.max(1,page-1)}}}>Anterior</Link><span className="muted">Página {page} de {Math.ceil(count/100)}</span><Link className="button-secondary" aria-disabled={page*100>=count} href={{query:{...params,page:page+1}}}>Próxima</Link></nav>}
  </div></FinancePrivacyBoundary>;
}
