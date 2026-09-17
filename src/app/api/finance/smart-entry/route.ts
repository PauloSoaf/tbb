import { NextResponse } from "next/server";
import { z } from "zod";
import { SMART_SERVICES, type SmartServiceId } from "@/features/finance/smart-entry";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";

const requestSchema=z.object({serviceId:z.enum(["uber","99","indrive","ifood"]),accountId:z.string().trim().min(1).nullable()});

export async function GET(){
  const context=await requirePermission("READ");
  const [accounts,rules]=await Promise.all([
    prisma.account.findMany({where:{workspaceId:context.workspaceId,isArchived:false,institution:{not:"__TBB_UNASSIGNED__"}},select:{id:true,name:true,institution:true,type:true},orderBy:[{type:"asc"},{name:"asc"}]}),
    prisma.transactionRule.findMany({where:{workspaceId:context.workspaceId,isEnabled:true,source:"SMART_ENTRY"},select:{value:true,accountId:true},orderBy:{createdAt:"desc"}}),
  ]);
  const preferences:Partial<Record<SmartServiceId,string>>={};
  const availableAccounts=new Set(accounts.map(account=>account.id));
  for(const rule of rules){
    if(SMART_SERVICES.some(service=>service.id===rule.value)&&rule.accountId&&availableAccounts.has(rule.accountId)&&!(rule.value in preferences))preferences[rule.value as SmartServiceId]=rule.accountId;
  }
  return NextResponse.json({accounts,preferences});
}

export async function POST(request:Request){
  const context=await requirePermission("WRITE");
  const parsed=requestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Preferência inválida."},{status:400});
  const {serviceId,accountId}=parsed.data;
  const service=SMART_SERVICES.find(item=>item.id===serviceId)!;
  const account=accountId?await prisma.account.findFirst({where:{id:accountId,workspaceId:context.workspaceId,isArchived:false,currency:"BRL"},select:{id:true,name:true,type:true}}):null;
  if(accountId&&!account)return NextResponse.json({error:"A conta ou cartão selecionado não está disponível."},{status:400});
  await prisma.$transaction(async tx=>{
    await tx.transactionRule.deleteMany({where:{workspaceId:context.workspaceId,source:"SMART_ENTRY",value:serviceId}});
    if(account)await tx.transactionRule.create({data:{workspaceId:context.workspaceId,name:`Preenchimento inteligente · ${service.name}`,field:"description",operator:"contains",value:service.id,accountId:account.id,source:"SMART_ENTRY",setMerchant:service.merchant,addTag:service.tags[0],priority:10}});
    await tx.activityEvent.create({data:{workspaceId:context.workspaceId,actorUserId:context.userId,type:"finance.smart_entry_preference",entityType:"TransactionRule",entityId:serviceId,source:"MANUAL",metadata:{serviceId,accountId:account?.id||null}}});
  });
  return NextResponse.json({ok:true,message:account?`${service.name} será associado a ${account.name}.`:`A associação de ${service.name} foi removida.`});
}
