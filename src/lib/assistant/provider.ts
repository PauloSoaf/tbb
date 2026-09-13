import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type AssistantContext={workspaceId:string;userId:string;route:string};
export interface AssistantProvider{reply(prompt:string,context:AssistantContext):Promise<string>}

function outputText(response:{output_text?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>}){
  return response.output_text||response.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;
}

async function workspaceFacts(prompt:string,context:AssistantContext){
  const text=prompt.toLocaleLowerCase("pt-BR");
  const where={workspaceId:context.workspaceId};
  if(text.includes("gasto")||text.includes("finan")||text.includes("saldo")){
    const [transactions,accounts]=await Promise.all([prisma.financeTransaction.count({where}),prisma.account.count({where:{...where,isArchived:false,institution:{not:"__TBB_UNASSIGNED__"}}})]);
    return {facts:`Existem ${transactions} transações e ${accounts} contas ativas.`,fallback:`Seu workspace tem ${transactions} transação(ões) e ${accounts} conta(s) ativa(s). Você também pode escrever “uber 29 reais” aqui para preparar um lançamento.`};
  }
  if(text.includes("hábito")||text.includes("habito")||text.includes("rotina")){
    const active=await prisma.habit.count({where:{...where,isArchived:false}});
    return {facts:`Existem ${active} hábitos ativos.`,fallback:`Você tem ${active} hábito(s) ativo(s). Today reúne o que está programado agora; Habits mostra registros, sequência e heatmap anual.`};
  }
  if(text.includes("carreira")||text.includes("candidatura")||text.includes("emprego")){
    const applications=await prisma.application.count({where});
    return {facts:`Existem ${applications} candidaturas no pipeline.`,fallback:`Há ${applications} candidatura(s) no pipeline. Em Career você pode revisar estágio, próxima ação e follow-up.`};
  }
  if(text.includes("tarefa")||text.includes("agenda")||text.includes("dia")){
    const open=await prisma.task.count({where:{...where,status:{not:"DONE"}}});
    return {facts:`Existem ${open} tarefas abertas.`,fallback:`Você tem ${open} tarefa(s) aberta(s). Diga “adicione tarefa revisar currículo amanhã” para eu preparar uma nova.`};
  }
  return {facts:"Nenhum resumo específico foi solicitado.",fallback:`Estou no contexto de ${context.route}. Posso consultar resumos, preparar transações (“uber 29 reais”), tarefas (“adicione tarefa…”) e metas (“crie uma meta…”). Tudo aparece para confirmação antes de ser salvo.`};
}

class WorkspaceAssistantProvider implements AssistantProvider{
  async reply(prompt:string,context:AssistantContext){
    const local=await workspaceFacts(prompt,context);
    if(process.env.OPENAI_API_KEY){
      try{
        const useWeb=/\b(pesquise|busque na web|internet|notícia|noticia|atual|preço hoje)\b/i.test(prompt);
        const response=await fetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"content-type":"application/json"},
          body:JSON.stringify({
            model:process.env.OPENAI_ASSISTANT_MODEL||"gpt-5.5",
            store:false,
            instructions:"Você é o Assistente TBB. Responda em português claro e curto. Ajude a organizar vida, tarefas, hábitos, finanças e carreira. Use os fatos do workspace quando forem relevantes. Nunca afirme que alterou dados; alterações são propostas e confirmadas pela interface.",
            input:`Rota atual: ${context.route}\nFatos do workspace: ${local.facts}\nPergunta: ${prompt}`,
            tools:useWeb?[{type:"web_search"}]:undefined,
            safety_identifier:createHash("sha256").update(context.userId).digest("hex").slice(0,32),
          }),
        });
        if(response.ok){const answer=outputText(await response.json());if(answer)return answer}
      }catch{}
    }
    return local.fallback;
  }
}

export function getAssistantProvider():AssistantProvider{return new WorkspaceAssistantProvider()}
