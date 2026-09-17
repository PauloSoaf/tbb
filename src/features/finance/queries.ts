import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, dateKeyToUTC, startOfMonth } from "@/lib/dates";
import { isUnassignedAccount } from "@/features/finance/unassigned-account";

export async function financeSummary(workspaceId: string, today: string) {
  const monthStart=dateKeyToUTC(startOfMonth(today)); const tomorrow=dateKeyToUTC(addDays(today,1));
  const [accounts, month, subscriptions, debts, savings, monthlyIncome] = await Promise.all([
    prisma.account.findMany({where:{workspaceId,isArchived:false},include:{transactions:{select:{type:true,amountCents:true}},incomingTransactions:{select:{amountCents:true}}},orderBy:{createdAt:"asc"}}),
    prisma.financeTransaction.groupBy({by:["type"],where:{workspaceId,date:{gte:monthStart,lt:tomorrow}},_sum:{amountCents:true}}),
    prisma.subscription.findMany({where:{workspaceId,status:"ACTIVE"}}),
    prisma.debt.aggregate({where:{workspaceId,status:"ACTIVE"},_sum:{remainingBalanceCents:true}}),
    prisma.savingsGoal.aggregate({where:{workspaceId,status:"ACTIVE"},_sum:{currentAmountCents:true,targetAmountCents:true}}),
    prisma.financeTransaction.findFirst({where:{workspaceId,type:"INCOME",recurring:true,tags:{has:"renda-mensal:tbb"},date:{lt:tomorrow}},select:{amountCents:true},orderBy:[{date:"desc"},{updatedAt:"desc"}]}),
  ]);
  const accountBalances=accounts.map(account=>{const movement=account.transactions.reduce((sum,t)=>sum+(t.type==="INCOME"||t.type==="REFUND"?t.amountCents:t.type==="EXPENSE"||t.type==="TRANSFER"?-t.amountCents:t.amountCents),0)+account.incomingTransactions.reduce((sum,t)=>sum+t.amountCents,0);return {...account,balanceCents:account.initialBalanceCents+movement};});
  const total=(type:string)=>month.find(row=>row.type===type)?._sum.amountCents||0;
  const income=total("INCOME")+total("REFUND"), expenses=total("EXPENSE");
  const subscriptionMonthly=subscriptions.reduce((sum,s)=>sum+Math.round(s.amountCents*(s.billingCycle==="WEEKLY"?52/12:s.billingCycle==="QUARTERLY"?1/3:s.billingCycle==="YEARLY"?1/12:s.billingCycle==="CUSTOM"&&s.customDays?30/s.customDays:1)),0);
  return {accounts:accountBalances,income,monthlyIncome:monthlyIncome?.amountCents||0,expenses,savings:income-expenses,savingsRate:income?Math.round((income-expenses)/income*100):0,subscriptionMonthly,debtCents:debts._sum.remainingBalanceCents||0,savingsCurrent:savings._sum.currentAmountCents||0,savingsTarget:savings._sum.targetAmountCents||0,netWorth:accountBalances.filter(account=>!isUnassignedAccount(account)).reduce((sum,a)=>sum+a.balanceCents,0)-(debts._sum.remainingBalanceCents||0)};
}

export async function monthlyCashFlow(workspaceId: string, months=6, today=new Date().toISOString().slice(0,10)) {
  const [year,month]=today.split("-").map(Number);
  const monthKeys=Array.from({length:months},(_,index)=>{
    const date=new Date(Date.UTC(year,month-1-(months-1-index),1));
    return date.toISOString().slice(0,7);
  });
  const from=dateKeyToUTC(`${monthKeys[0]}-01`);
  const until=dateKeyToUTC(addDays(today,1));
  const rows=await prisma.$queryRaw<Array<{month:Date;type:string;total:bigint}>>(Prisma.sql`
    SELECT date_trunc('month', "date") AS month, "type"::text AS type, SUM("amountCents")::bigint AS total
    FROM "FinanceTransaction" WHERE "workspaceId"=${workspaceId} AND "date">=${from} AND "date"<${until}
    GROUP BY 1,2 ORDER BY 1 ASC`);
  const map=new Map(monthKeys.map(key=>[key,{month:key,income:0,expenses:0}]));
  for(const row of rows){const key=row.month.toISOString().slice(0,7);const item=map.get(key)||{month:key,income:0,expenses:0};if(row.type==="INCOME"||row.type==="REFUND")item.income+=Number(row.total)/100;if(row.type==="EXPENSE")item.expenses+=Number(row.total)/100;map.set(key,item);}
  return [...map.values()];
}

export async function spendingByCategory(workspaceId: string, from: Date) {
  return prisma.financeTransaction.groupBy({by:["categoryId"],where:{workspaceId,type:"EXPENSE",date:{gte:from}},_sum:{amountCents:true},orderBy:{_sum:{amountCents:"desc"}},take:8});
}

export async function financeAnalytics(workspaceId:string,today:string){
  const from=addDays(today,-111);
  const range={gte:dateKeyToUTC(from),lt:dateKeyToUTC(addDays(today,1))};
  const todayDate=dateKeyToUTC(today);
  const monthRange={gte:dateKeyToUTC(startOfMonth(today)),lt:dateKeyToUTC(addDays(today,1))};
  const [categoryTotals,dailyTotals,categoryNames,creditAccounts,budgets,subscriptions,debts]=await Promise.all([
    prisma.financeTransaction.groupBy({by:["categoryId"],where:{workspaceId,type:"EXPENSE",date:range},_sum:{amountCents:true},orderBy:{_sum:{amountCents:"desc"}},take:7}),
    prisma.financeTransaction.groupBy({by:["date"],where:{workspaceId,type:"EXPENSE",date:range},_sum:{amountCents:true},orderBy:{date:"asc"}}),
    prisma.financeCategory.findMany({where:{workspaceId,isArchived:false},select:{id:true,name:true,color:true}}),
    prisma.account.findMany({where:{workspaceId,isArchived:false,type:"CREDIT_CARD"},select:{id:true,name:true,institution:true,creditLimitCents:true,dueDay:true,transactions:{where:{date:monthRange,type:{in:["EXPENSE","REFUND"]}},select:{type:true,amountCents:true}}},orderBy:{createdAt:"asc"}}),
    prisma.budget.findMany({where:{workspaceId,startDate:{lte:todayDate},endDate:{gte:todayDate}},include:{category:{select:{name:true,color:true}}},orderBy:{limitCents:"desc"}}),
    prisma.subscription.findMany({where:{workspaceId,status:"ACTIVE"},select:{name:true,amountCents:true,nextChargeDate:true,billingCycle:true,customDays:true}}),
    prisma.debt.findMany({where:{workspaceId,status:"ACTIVE",minimumPaymentCents:{gt:0}},select:{name:true,minimumPaymentCents:true,dueDay:true}}),
  ]);
  const names=new Map(categoryNames.map(category=>[category.id,category]));
  const budgetSpending=await Promise.all(budgets.map(budget=>prisma.financeTransaction.aggregate({where:{workspaceId,categoryId:budget.categoryId,type:"EXPENSE",date:{gte:budget.startDate,lte:budget.endDate}},_sum:{amountCents:true}})));
  const [year,month,day]=today.split("-").map(Number);
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  const nextDebtDate=(dueDay:number|null)=>{
    if(!dueDay)return null;
    const makeDate=(yearValue:number,monthValue:number)=>new Date(Date.UTC(yearValue,monthValue,Math.min(dueDay,new Date(Date.UTC(yearValue,monthValue+1,0)).getUTCDate())));
    let value=makeDate(year,month-1);
    if(value<todayDate)value=makeDate(month===12?year+1:year,month===12?0:month);
    return value;
  };
  const nextSubscriptionDate=(initial:Date,cycle:string,customDays:number|null)=>{
    const value=new Date(initial);
    for(let guard=0;value<todayDate&&guard<240;guard++){
      if(cycle==="WEEKLY")value.setUTCDate(value.getUTCDate()+7);
      else if(cycle==="QUARTERLY")value.setUTCMonth(value.getUTCMonth()+3);
      else if(cycle==="YEARLY")value.setUTCFullYear(value.getUTCFullYear()+1);
      else if(cycle==="CUSTOM"&&customDays)value.setUTCDate(value.getUTCDate()+customDays);
      else value.setUTCMonth(value.getUTCMonth()+1);
    }
    return value;
  };
  const upcomingUntil=dateKeyToUTC(addDays(today,30));
  const upcoming=[
    ...subscriptions.map(item=>({label:item.name,kind:"Assinatura",amount:item.amountCents/100,date:nextSubscriptionDate(item.nextChargeDate,item.billingCycle,item.customDays)})),
    ...debts.flatMap(item=>{const date=nextDebtDate(item.dueDay);return date?[{label:item.name,kind:"Dívida",amount:item.minimumPaymentCents/100,date}]:[];}),
  ].filter(item=>item.date<=upcomingUntil).sort((a,b)=>a.date.getTime()-b.date.getTime()).slice(0,8).map(item=>({...item,date:item.date.toISOString().slice(0,10)}));
  return {
    from,
    to:today,
    day,
    daysInMonth,
    categories:categoryTotals.map(item=>({
      category:item.categoryId?names.get(item.categoryId)?.name||"Categoria removida":"Sem categoria",
      amount:(item._sum.amountCents||0)/100,
      color:item.categoryId?names.get(item.categoryId)?.color||"var(--chart-1)":"var(--muted-foreground)",
    })),
    daily:dailyTotals.map(item=>({date:item.date.toISOString().slice(0,10),amount:(item._sum.amountCents||0)/100})),
    creditCards:creditAccounts.map(account=>{
      const spent=Math.max(0,account.transactions.reduce((total,item)=>total+(item.type==="EXPENSE"?item.amountCents:-item.amountCents),0));
      const limit=account.creditLimitCents||0;
      return {name:account.name,institution:account.institution,spent:spent/100,available:Math.max(0,limit-spent)/100,limit:limit/100,usage:limit?Math.round(spent/limit*100):null,dueDay:account.dueDay};
    }),
    budgets:budgets.map((budget,index)=>{const spent=budgetSpending[index]._sum.amountCents||0;return {category:budget.category.name,color:budget.category.color,spent:spent/100,remaining:Math.max(0,budget.limitCents-spent)/100,limit:budget.limitCents/100,usage:Math.round(spent/budget.limitCents*100)};}),
    upcoming,
  };
}
