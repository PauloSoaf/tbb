import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinanceDataGrid } from "@/features/finance/FinanceDataGrid";
import { FinanceTransactionFilters } from "@/features/finance/FinanceTransactionFilters";
import { transactionWhere, transactionPage, TRANSACTION_PAGE_SIZE, MAX_TRANSACTION_PAGE, type TransactionSearchParams } from "@/features/finance/transaction-filters";
import { ReadOnlyTransactions } from "@/features/finance/ReadOnlyTransactions";
import { financePageAccess } from "@/features/finance/finance-page-access";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type SearchParams=TransactionSearchParams;

export default async function TransactionsPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const context=await financePageAccess();
  const params=await searchParams;
  const where=transactionWhere(context.workspaceId,params);
  const [accounts,categories,count]=await Promise.all([
    prisma.account.findMany({where:{workspaceId:context.workspaceId},select:{id:true,name:true},orderBy:{name:"asc"}}),
    prisma.financeCategory.findMany({where:{workspaceId:context.workspaceId,isArchived:false},select:{id:true,name:true},orderBy:{name:"asc"}}),
    prisma.financeTransaction.count({where}),
  ]);
  const page=Math.min(transactionPage(params.page),Math.max(1,Math.ceil(count/TRANSACTION_PAGE_SIZE)));
  const pages=Math.min(MAX_TRANSACTION_PAGE,Math.max(1,Math.ceil(count/TRANSACTION_PAGE_SIZE)));
  const transactions=await prisma.financeTransaction.findMany({where,orderBy:[{date:"desc"},{createdAt:"desc"},{id:"desc"}],skip:(page-1)*TRANSACTION_PAGE_SIZE,take:TRANSACTION_PAGE_SIZE});
  const readRows=transactions.map(transaction=>({...transaction,date:transaction.date.toISOString().slice(0,10)}));
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

  return <FinancePrivacyBoundary canWrite={context.canWrite}><div className="stack">
    <PageHeader eyebrow="DINHEIRO · TRANSAÇÕES" title="Lançamentos inteligentes." description={`${count} lançamento(s). Edite, selecione intervalos, copie e cole como em uma planilha.`}>{context.canWrite&&<Link className="button-secondary" href="/finance/imports">Importar arquivo</Link>}</PageHeader>
    <FinanceTransactionFilters accounts={accounts} categories={categories} current={params}/>
    {!context.canWrite?<ReadOnlyTransactions rows={readRows} accounts={accounts}/>:<>
      {transactions.some(row=>row.type==="TRANSFER")&&<ReadOnlyTransactions rows={readRows.filter(row=>row.type==="TRANSFER")} accounts={accounts} title="Transferências nesta página · somente leitura"/>}
      <FinanceDataGrid initialRows={rows} accounts={accounts} categories={categories} today={dayKey(new Date(),context.workspace.timezone)} timeZone={context.workspace.timezone}/>
    </>}
    {count>TRANSACTION_PAGE_SIZE&&<nav className="row justify-between">{page>1?<Link className="button-secondary" href={{query:{...params,page:page-1}}}>Anterior</Link>:<span aria-disabled="true">Anterior</span>}<span className="muted">Página {page} de {pages}</span>{page<pages?<Link className="button-secondary" href={{query:{...params,page:page+1}}}>Próxima</Link>:<span aria-disabled="true">Próxima</span>}</nav>}
    {count>MAX_TRANSACTION_PAGE*TRANSACTION_PAGE_SIZE&&<p className="muted text-xs">Use os filtros para consultar os registros restantes.</p>}
  </div></FinancePrivacyBoundary>;
}
