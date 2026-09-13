export const stages = ["SAVED","APPLIED","RECRUITER_CONTACT","HR_INTERVIEW","TECHNICAL_INTERVIEW","FINAL_INTERVIEW","OFFER","ACCEPTED","REJECTED","WITHDRAWN"] as const;
export const stageLabels: Record<(typeof stages)[number],string> = {SAVED:"Salva",APPLIED:"Candidatura enviada",RECRUITER_CONTACT:"Contato com recrutador",HR_INTERVIEW:"Entrevista RH",TECHNICAL_INTERVIEW:"Entrevista técnica",FINAL_INTERVIEW:"Entrevista final",OFFER:"Proposta",ACCEPTED:"Aceita",REJECTED:"Não selecionada",WITHDRAWN:"Retirada"};
export function careerFunnel(applications: {id:string;status:string;appliedAt:Date|null}[], events:{entityId:string;metadata:unknown}[]=[]){
  const history=new Map<string,Set<string>>();
  for(const event of events){if(event.metadata && typeof event.metadata==='object' && 'to' in event.metadata && typeof event.metadata.to==='string'){const states=history.get(event.entityId)??new Set<string>();states.add(event.metadata.to);history.set(event.entityId,states);}}
  let applied=0,responses=0,interviews=0,offers=0;
  for(const app of applications){const states=new Set([app.status,...(history.get(app.id)??[])]);if(app.appliedAt || [...states].some(s=>s!=='SAVED'))applied++;
    if([...states].some(s=>['RECRUITER_CONTACT','HR_INTERVIEW','TECHNICAL_INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED','REJECTED'].includes(s)))responses++;
    if([...states].some(s=>['HR_INTERVIEW','TECHNICAL_INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED'].includes(s)))interviews++;
    if(states.has('OFFER')||states.has('ACCEPTED'))offers++;
  }
  return {applied,responses,interviews,offers,responseRate:applied?Math.round(responses/applied*100):0,interviewRate:applied?Math.round(interviews/applied*100):0,offerRate:interviews?Math.round(offers/interviews*100):0};
}
