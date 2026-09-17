export type SmartServiceId="uber"|"99"|"indrive"|"ifood";
export type SmartService={id:SmartServiceId;name:string;merchant:string;description:string;tags:string[];categoryNames:string[];matches:(value:string)=>boolean};
export type SmartAccountPreferences=Partial<Record<SmartServiceId,string>>;

function normalized(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim()}
function hasTerm(value:string,term:string){return new RegExp(`(^|\\s)${term}(?=\\s|$)`,"i").test(value)}
function amountFrom(value:string){
  const withoutService=value.replace(/i\s*food|in\s*drive|99(?:app)?|uber|\bdrive\b/i," ").replace(/\b(reais?|brl)\b/gi," ");
  const match=withoutService.match(/(?:r\$\s*)?(\d[\d.,]*)/i);
  if(!match)return "";
  const raw=match[1].replace(/[.,]$/,"");
  const number=Number(raw.includes(",")?raw.replace(/\./g,"").replace(",","."):/\.\d{1,2}$/.test(raw)?raw:raw.replace(/\./g,""));
  return Number.isFinite(number)&&number>0?number.toFixed(2).replace(".",","):"";
}

export const SMART_SERVICES:SmartService[]=[
  {id:"ifood",name:"iFood",merchant:"iFood",description:"Pedido no iFood",tags:["ifood","delivery","alimentacao"],categoryNames:["Alimentação","Restaurantes","Delivery"],matches:value=>hasTerm(value,"i\\s*food")},
  {id:"indrive",name:"inDrive",merchant:"inDrive",description:"Viagem inDrive",tags:["indrive","mobilidade","transporte"],categoryNames:["Transporte","Mobilidade"],matches:value=>hasTerm(value,"in\\s*drive")||normalized(value)==="drive"||normalized(value).startsWith("drive ")},
  {id:"uber",name:"Uber",merchant:"Uber",description:"Viagem Uber",tags:["uber","mobilidade","transporte"],categoryNames:["Transporte","Mobilidade"],matches:value=>hasTerm(value,"uber")},
  {id:"99",name:"99",merchant:"99",description:"Viagem 99",tags:["99","mobilidade","transporte"],categoryNames:["Transporte","Mobilidade"],matches:value=>hasTerm(value,"99(?:app)?")},
];

export function recognizeSmartService(value:string){
  const clean=normalized(value);
  if(!clean)return null;
  return SMART_SERVICES.find(service=>service.matches(clean))||null;
}

export function smartEntryPatch(value:string,categories:{id:string;name:string}[],preferences:SmartAccountPreferences,currentTags=""){
  const service=recognizeSmartService(value);
  if(!service)return null;
  const desired=service.categoryNames.map(normalized);
  const category=categories.find(item=>{const name=normalized(item.name);return desired.some(expected=>name===expected||name.includes(expected)||expected.includes(name))});
  const tags=[...new Set([...currentTags.split(",").map(tag=>tag.trim()).filter(Boolean),...service.tags])];
  return {
    service,
    description:service.description,
    merchant:service.merchant,
    categoryId:category?.id||"",
    accountId:preferences[service.id]||"",
    type:"EXPENSE" as const,
    amount:amountFrom(value),
    tags:tags.join(", "),
  };
}
