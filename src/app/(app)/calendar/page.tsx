import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { addDays, dayKey, daysBetween, endOfMonth, isDateKey, startOfMonth, startOfWeek } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { TbbCalendar, type CalendarEvent } from "@/components/calendar/TbbCalendar";

export default async function CalendarPage({searchParams}:{searchParams:Promise<{date?:string;view?:string}>}){const context=await getWorkspaceContext();const params=await searchParams;const today=dayKey(new Date(),context.workspace.timezone);const anchor=isDateKey(params.date||"")?params.date!:today;const view=params.view==="month"?"month":"week";const first=view==="week"?startOfWeek(anchor):startOfWeek(startOfMonth(anchor));const last=view==="week"?addDays(first,6):addDays(startOfWeek(addDays(endOfMonth(anchor),1)),-1);const days=daysBetween(first,last);const timestampStart=new Date(`${first}T00:00:00Z`);const timestampEnd=new Date(`${addDays(last,1)}T00:00:00Z`);
  const [tasks,interviews,goals,subscriptions]=await Promise.all([
    prisma.task.findMany({where:{workspaceId:context.workspaceId,OR:[{dueDate:{gte:first,lte:last}},{scheduledAt:{gte:timestampStart,lt:timestampEnd}}]}}),
    prisma.interview.findMany({where:{workspaceId:context.workspaceId,scheduledAt:{gte:timestampStart,lt:timestampEnd}},include:{application:true}}),
    prisma.goal.findMany({where:{workspaceId:context.workspaceId,targetDate:{gte:first,lte:last}}}),
    prisma.subscription.findMany({where:{workspaceId:context.workspaceId,status:"ACTIVE",nextChargeDate:{gte:timestampStart,lt:timestampEnd}}}),
  ]);
  const time=(date:Date)=>new Intl.DateTimeFormat(context.workspace.locale,{timeZone:context.workspace.timezone,hour:"2-digit",minute:"2-digit"}).format(date);
  const events:CalendarEvent[]=[
    ...tasks.map(item=>({id:`task-${item.id}`,date:item.dueDate||dayKey(item.scheduledAt!,context.workspace.timezone),time:item.scheduledAt?time(item.scheduledAt):undefined,type:"task" as const,label:item.title,detail:item.description||"Tarefa do seu workspace.",href:"/tasks"})),
    ...interviews.map(item=>({id:`interview-${item.id}`,date:dayKey(item.scheduledAt,context.workspace.timezone),time:time(item.scheduledAt),type:"interview" as const,label:item.title||item.application.jobTitle,detail:`${item.durationMinutes} min · ${item.location||"Local a definir"}`,href:`/career/applications/${item.applicationId}`})),
    ...goals.map(item=>({id:`goal-${item.id}`,date:item.targetDate!,type:"goal" as const,label:item.name,detail:"Data-alvo da meta.",href:"/goals"})),
    ...subscriptions.map(item=>({id:`subscription-${item.id}`,date:dayKey(item.nextChargeDate,context.workspace.timezone),type:"subscription" as const,label:item.name,detail:`Próxima cobrança · ${(item.amountCents/100).toLocaleString(context.workspace.locale,{style:"currency",currency:context.workspace.currency})}`,href:"/finance/subscriptions"})),
  ];
  return <div className="stack"><PageHeader eyebrow="LIFE · CALENDAR" title="Uma agenda, todo o seu contexto." description="Semana e mês com tarefas, entrevistas, metas e cobranças projetadas das fontes originais."/><TbbCalendar anchor={anchor} view={view} days={days} events={events} locale={context.workspace.locale}/></div>
}
