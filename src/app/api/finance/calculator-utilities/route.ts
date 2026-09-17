import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dateOnly } from "@/features/finance/money";
import { ensureUnassignedAccount } from "@/features/finance/unassigned-account";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";

const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,"Data inválida.");
const optionalId=z.string().trim().min(1).nullable().optional();
const base=z.object({
  amountCents:z.number().int().positive().max(999_999_999_99),
  date:dateSchema,
  accountId:optionalId,
  expression:z.string().trim().max(100).optional(),
});
const requestSchema=z.discriminatedUnion("kind",[
  base.extend({
    kind:z.literal("transaction"),
    type:z.enum(["EXPENSE","INCOME"]),
    description:z.string().trim().min(2,"Informe uma descrição.").max(300),
    categoryId:optionalId,
    creditCard:z.boolean().default(false),
  }),
  base.extend({kind:z.literal("monthly-income")}),
]);

function refreshFinance(){
  revalidatePath("/finance","layout");
  for(const path of ["/finance/transactions","/today","/insights"])revalidatePath(path);
}

export async function GET(){
  const context=await requirePermission("READ");
  const [accounts,categories]=await Promise.all([
    prisma.account.findMany({
      where:{workspaceId:context.workspaceId,isArchived:false,institution:{not:"__TBB_UNASSIGNED__"}},
      select:{id:true,name:true,institution:true,type:true},
      orderBy:[{type:"asc"},{name:"asc"}],
    }),
    prisma.financeCategory.findMany({
      where:{workspaceId:context.workspaceId,isArchived:false},
      select:{id:true,name:true,type:true,color:true},
      orderBy:{name:"asc"},
    }),
  ]);
  return NextResponse.json({accounts,categories,today:dayKey(new Date(),context.workspace.timezone)});
}

export async function POST(request:Request){
  const context=await requirePermission("WRITE");
  const parsed=requestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Confira os dados."},{status:400});
  const data=parsed.data;
  try{
    const requestedAccount=data.accountId?await prisma.account.findFirst({
      where:{id:data.accountId,workspaceId:context.workspaceId,isArchived:false,currency:"BRL"},
    }):null;
    if(data.accountId&&!requestedAccount)return NextResponse.json({error:"A conta selecionada não está disponível."},{status:400});

    if(data.kind==="transaction"){
      if(data.creditCard&&requestedAccount?.type!=="CREDIT_CARD")return NextResponse.json({error:"Selecione um cartão de crédito ativo."},{status:400});
      const category=data.categoryId?await prisma.financeCategory.findFirst({where:{id:data.categoryId,workspaceId:context.workspaceId,isArchived:false,type:data.type}}):null;
      if(data.categoryId&&!category)return NextResponse.json({error:"A categoria selecionada não está disponível para esse tipo."},{status:400});
      const item=await prisma.$transaction(async tx=>{
        const account=requestedAccount||await ensureUnassignedAccount(tx,context.workspaceId);
        const created=await tx.financeTransaction.create({data:{
          workspaceId:context.workspaceId,
          accountId:account.id,
          categoryId:category?.id||null,
          type:data.type,
          description:data.description,
          amountCents:data.amountCents,
          currency:"BRL",
          date:dateOnly(data.date),
          tags:["calculadora:tbb"],
          notes:data.expression?`Cálculo: ${data.expression}`:null,
          source:"CALCULATOR",
        }});
        await tx.activityEvent.create({data:{workspaceId:context.workspaceId,actorUserId:context.userId,type:"transaction.created",entityType:"FinanceTransaction",entityId:created.id,source:"CALCULATOR",metadata:{amountCents:data.amountCents,type:data.type,expression:data.expression||null,creditCard:data.creditCard}}});
        return created;
      });
      refreshFinance();
      return NextResponse.json({ok:true,id:item.id,message:data.creditCard?"Compra adicionada ao cartão.":data.type==="INCOME"?"Receita adicionada.":"Despesa adicionada."});
    }

    const entryDate=dateOnly(data.date);
    const monthStart=dateOnly(`${data.date.slice(0,7)}-01`);
    const nextMonth=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,1));
    await prisma.$transaction(async tx=>{
      const account=requestedAccount||await ensureUnassignedAccount(tx,context.workspaceId);
      const existing=await tx.financeTransaction.findFirst({where:{workspaceId:context.workspaceId,type:"INCOME",date:{gte:monthStart,lt:nextMonth},OR:[{tags:{has:"renda-mensal:tbb"}},{recurring:true,description:{contains:"renda mensal",mode:"insensitive"}}]},orderBy:{createdAt:"desc"}});
      if(existing){
        await tx.financeTransaction.update({where:{id:existing.id},data:{accountId:account.id,amountCents:data.amountCents,date:entryDate,description:"Renda mensal",recurring:true,tags:[...new Set([...existing.tags,"renda-mensal:tbb","calculadora:tbb"])],notes:data.expression?`Cálculo: ${data.expression}`:existing.notes,source:"CALCULATOR",revision:{increment:1}}});
        await tx.activityEvent.create({data:{workspaceId:context.workspaceId,actorUserId:context.userId,type:"income.monthly_updated",entityType:"FinanceTransaction",entityId:existing.id,source:"CALCULATOR",metadata:{amountCents:data.amountCents,expression:data.expression||null}}});
      }else{
        const created=await tx.financeTransaction.create({data:{workspaceId:context.workspaceId,accountId:account.id,type:"INCOME",description:"Renda mensal",amountCents:data.amountCents,currency:"BRL",date:entryDate,recurring:true,tags:["renda-mensal:tbb","calculadora:tbb"],notes:data.expression?`Cálculo: ${data.expression}`:null,source:"CALCULATOR"}});
        await tx.activityEvent.create({data:{workspaceId:context.workspaceId,actorUserId:context.userId,type:"income.monthly_created",entityType:"FinanceTransaction",entityId:created.id,source:"CALCULATOR",metadata:{amountCents:data.amountCents,expression:data.expression||null}}});
      }
    });
    refreshFinance();
    return NextResponse.json({ok:true,message:"Renda mensal atualizada."});
  }catch(error){
    const message=error instanceof z.ZodError?error.issues[0]?.message:error instanceof Prisma.PrismaClientKnownRequestError?"Não foi possível salvar o lançamento.":error instanceof Error?error.message:"Não foi possível concluir.";
    return NextResponse.json({error:message},{status:400});
  }
}
