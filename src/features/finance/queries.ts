import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, dateKeyToUTC, startOfMonth } from "@/lib/dates";

export async function financeSummary(workspaceId: string, today: string) {
  const monthStart=dateKeyToUTC(startOfMonth(today)); const tomorrow=dateKeyToUTC(addDays(today,1));
  const [accounts, month, subscriptions, debts, savings] = await Promise.all([
    prisma.account.findMany({where:{workspaceId,isArchived:false},include:{transactions:{select:{type:true,amountCents:true}},incomingTransactions:{select:{amountCents:true}}},orderBy:{createdAt:"asc"}}),
    prisma.financeTransaction.groupBy({by:["type"],where:{workspaceId,date:{gte:monthStart,lt:tomorrow}},_sum:{amountCents:true}}),
    prisma.subscription.findMany({where:{workspaceId,status:"ACTIVE"}}),
    prisma.debt.aggregate({where:{workspaceId,status:"ACTIVE"},_sum:{remainingBalanceCents:true}}),
    prisma.savingsGoal.aggregate({where:{workspaceId,status:"ACTIVE"},_sum:{currentAmountCents:true,targetAmountCents:true}}),
  ]);
  const accountBalances=accounts.map(account=>{const movement=account.transactions.reduce((sum,t)=>sum+(t.type==="INCOME"||t.type==="REFUND"?t.amountCents:t.type==="EXPENSE"||t.type==="TRANSFER"?-t.amountCents:t.amountCents),0)+account.incomingTransactions.reduce((sum,t)=>sum+t.amountCents,0);return {...account,balanceCents:account.initialBalanceCents+movement};});
  const total=(type:string)=>month.find(row=>row.type===type)?._sum.amountCents||0;
  const income=total("INCOME")+total("REFUND"), expenses=total("EXPENSE");
  const subscriptionMonthly=subscriptions.reduce((sum,s)=>sum+Math.round(s.amountCents*(s.billingCycle==="WEEKLY"?52/12:s.billingCycle==="QUARTERLY"?1/3:s.billingCycle==="YEARLY"?1/12:s.billingCycle==="CUSTOM"&&s.customDays?30/s.customDays:1)),0);
  return {accounts:accountBalances,income,expenses,savings:income-expenses,savingsRate:income?Math.round((income-expenses)/income*100):0,subscriptionMonthly,debtCents:debts._sum.remainingBalanceCents||0,savingsCurrent:savings._sum.currentAmountCents||0,savingsTarget:savings._sum.targetAmountCents||0,netWorth:accountBalances.reduce((sum,a)=>sum+a.balanceCents,0)-(debts._sum.remainingBalanceCents||0)};
}

export async function monthlyCashFlow(workspaceId: string, months=6) {
  const rows=await prisma.$queryRaw<Array<{month:Date;type:string;total:bigint}>>(Prisma.sql`
    SELECT date_trunc('month', "date") AS month, "type"::text AS type, SUM("amountCents")::bigint AS total
    FROM "FinanceTransaction" WHERE "workspaceId"=${workspaceId} AND "date">=CURRENT_DATE - (${months} * INTERVAL '1 month')
    GROUP BY 1,2 ORDER BY 1 ASC`);
  const map=new Map<string,{month:string;income:number;expenses:number}>();
  for(const row of rows){const key=row.month.toISOString().slice(0,7);const item=map.get(key)||{month:key,income:0,expenses:0};if(row.type==="INCOME"||row.type==="REFUND")item.income+=Number(row.total)/100;if(row.type==="EXPENSE")item.expenses+=Number(row.total)/100;map.set(key,item);}
  return [...map.values()];
}

export async function spendingByCategory(workspaceId: string, from: Date) {
  return prisma.financeTransaction.groupBy({by:["categoryId"],where:{workspaceId,type:"EXPENSE",date:{gte:from}},_sum:{amountCents:true},orderBy:{_sum:{amountCents:"desc"}},take:8});
}
