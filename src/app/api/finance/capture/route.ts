import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { capturedTransactionSchema,extractExpenseText } from "@/features/finance/natural-language";
import { ensureUnassignedAccount } from "@/features/finance/unassigned-account";
import { transactionFingerprint } from "@/features/finance/import-engine";
import { dateOnly } from "@/features/finance/money";
const requestSchema=z.discriminatedUnion("mode",[
  z.object({mode:z.literal("parse"),text:z.string().trim().min(3).max(20_000),today:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
  z.object({mode:z.literal("confirm"),transactions:z.array(capturedTransactionSchema).min(1).max(100)}),
]);
export async function POST(request:Request){const context=await requirePermission("WRITE");const parsed=requestSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Entrada inválida."},{status:400});if(parsed.data.mode==="parse"){const accounts=await prisma.account.findMany({where:{workspaceId:context.workspaceId,isArchived:false},select:{id:true,name:true,institution:true,type:true}});const result=await extractExpenseText(parsed.data.text,parsed.data.today,accounts);return NextResponse.json(result)}
  const requested=parsed.data.transactions;const accountIds=[...new Set(requested.flatMap(item=>item.accountId?[item.accountId]:[]))];const owned=await prisma.account.count({where:{workspaceId:context.workspaceId,id:{in:accountIds},isArchived:false}});if(owned!==accountIds.length)return NextResponse.json({error:"Uma das contas não está disponível."},{status:400});
  const result=await prisma.$transaction(async tx=>{let unassignedId:string|null=null;const data=[];for(const item of requested){if(!item.accountId&&!unassignedId)unassignedId=(await ensureUnassignedAccount(tx,context.workspaceId)).id;const accountId=item.accountId||unassignedId!;data.push({workspaceId:context.workspaceId,accountId,type:item.type,description:item.description,amountCents:item.amountCents,currency:"BRL",date:dateOnly(item.date),source:"AI_TEXT",fingerprint:transactionFingerprint(context.workspaceId,accountId,{date:item.date,description:item.description,amountCents:item.amountCents,type:item.type,externalId:null})})}const created=await tx.financeTransaction.createMany({data,skipDuplicates:true});await tx.activityEvent.create({data:{workspaceId:context.workspaceId,actorUserId:context.userId,type:"TransactionsCaptured",entityType:"FinanceTransaction",entityId:"batch",source:"AI_TEXT",metadata:{requested:data.length,created:created.count}}});return created.count});
  for(const path of ["/finance","/finance/transactions","/today","/insights"])revalidatePath(path);return NextResponse.json({created:result,skipped:requested.length-result})}
