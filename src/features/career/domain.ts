export const stages = ["SAVED","WANT_TO_APPLY","APPLIED","IN_REVIEW","RECRUITER_CONTACT","TECHNICAL_TEST","HR_INTERVIEW","TECHNICAL_INTERVIEW","FINAL_INTERVIEW","OFFER","ACCEPTED","REJECTED","WITHDRAWN","ARCHIVED"] as const;
export const stageLabels: Record<(typeof stages)[number],string> = {SAVED:"Salva",WANT_TO_APPLY:"Quero aplicar",APPLIED:"Aplicada",IN_REVIEW:"Em análise",RECRUITER_CONTACT:"Contato com recrutador",TECHNICAL_TEST:"Teste técnico",HR_INTERVIEW:"Entrevista RH",TECHNICAL_INTERVIEW:"Entrevista técnica",FINAL_INTERVIEW:"Entrevista final",OFFER:"Oferta",ACCEPTED:"Aprovada",REJECTED:"Negativa",WITHDRAWN:"Recusada por mim",ARCHIVED:"Arquivada"};
export function careerFunnel(applications: {id:string;status:string;appliedAt:Date|null;response?:string}[], events:{entityId:string;metadata:unknown}[]=[]){
  const history=new Map<string,Set<string>>();
  for(const event of events){if(event.metadata && typeof event.metadata==='object' && 'to' in event.metadata && typeof event.metadata.to==='string'&&(stages as readonly string[]).includes(event.metadata.to)){const states=history.get(event.entityId)??new Set<string>();states.add(event.metadata.to);history.set(event.entityId,states);}}
  let applied=0,responses=0,interviews=0,offers=0,respondedApplications=0;
  for(const app of applications){const states=new Set([app.status,...(history.get(app.id)??[])]);const wasApplied=!!app.appliedAt || [...states].some(s=>!['SAVED','WANT_TO_APPLY','ARCHIVED','WITHDRAWN'].includes(s));if(wasApplied)applied++;
    if(['POSITIVE','NEGATIVE'].includes(app.response??'')||[...states].some(s=>['RECRUITER_CONTACT','TECHNICAL_TEST','HR_INTERVIEW','TECHNICAL_INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED','REJECTED'].includes(s))){responses++;if(wasApplied)respondedApplications++;}
    if([...states].some(s=>['HR_INTERVIEW','TECHNICAL_INTERVIEW','FINAL_INTERVIEW','OFFER','ACCEPTED'].includes(s)))interviews++;
    if(states.has('OFFER')||states.has('ACCEPTED'))offers++;
  }
  return {applied,responses,interviews,offers,responseRate:applied?Math.round(respondedApplications/applied*100):0,interviewRate:applied?Math.round(interviews/applied*100):0,offerRate:interviews?Math.round(offers/interviews*100):0};
}
export const closedStages = ["ACCEPTED","REJECTED","WITHDRAWN","ARCHIVED"];
