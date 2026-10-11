import { z } from "zod";
import { addDays } from "@/lib/dates";
import { normalizeDate, parseMoney } from "./money";
import { smartEntryPatch } from "./smart-entry";
export const capturedTransactionSchema=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),description:z.string().trim().min(1).max(300),amountCents:z.number().int().positive(),type:z.enum(["EXPENSE","INCOME","REFUND"]),accountId:z.string().nullable(),accountHint:z.string().max(120).nullable(),confidence:z.number().min(0).max(1),recurring:z.boolean().default(false)});
export type CapturedTransaction=z.infer<typeof capturedTransactionSchema>;
type CaptureAccount={id:string;name:string;institution:string|null;type:string};
const normalized=(value:string)=>value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase("pt-BR");
function stripChatPrefix(line:string){return line.replace(/^\s*\[?(\d{1,2}\/\d{1,2})(?:\/\d{2,4})?\s*,\s*\d{1,2}:\d{2}\]?\s*[^:]{0,80}:\s*/,"$1 ")}
function resolveDate(line:string,today:string){const match=line.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);if(!match)return today;const year=match[3]?Number(match[3])+(match[3].length===2?2000:0):Number(today.slice(0,4));try{return normalizeDate(`${match[1]}/${match[2]}/${year}`)}catch{return today}}
const DEBIT_TYPES=["CHECKING","DIGITAL_WALLET","CASH"];
function accountFor(line:string,accounts:CaptureAccount[]){
  const text=normalized(line);
  const credit=/\b(credito|credit|cartao)\b/.test(text),debit=/\b(debito|debit)\b/.test(text);
  // An explicit payment method outranks name matching: "itau credito" must never land on the Itaú checking account.
  const byMethod=credit?accounts.filter(account=>account.type==="CREDIT_CARD"):debit?accounts.filter(account=>DEBIT_TYPES.includes(account.type)):[];
  const pool=byMethod.length?byMethod:accounts;
  const scored=pool.map(account=>{
    const terms=[account.name,account.institution||""].flatMap(value=>normalized(value).split(/\s+/)).filter(term=>term.length>=3);
    return {account,score:terms.filter(term=>text.includes(term)).length*3};
  }).sort((a,b)=>b.score-a.score);
  if(scored[0]?.score>0)return scored[0].account;
  // The method was stated and only one account can satisfy it, so it is still an unambiguous match.
  return byMethod.length===1?byMethod[0]:null;
}
function amountIn(line:string){
  const explicit=line.match(/(?:R\$\s*(\d+(?:\.\d{3})*(?:[.,]\d{1,2})?)|(\d+(?:\.\d{3})*(?:[.,]\d{1,2})?)\s*(?:reais?|brl)\b)/i);
  if(explicit)return {raw:explicit[1]||explicit[2],index:explicit.index||0,length:explicit[0].length};
  if(!/\b(renda|sal[aá]rio|receita|entrada|ganho|despesa|gasto|or[cç]amento|aluguel|conta)\b/i.test(line))return null;
  const withoutDate=line.replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g,value=>" ".repeat(value.length));
  const values=[...withoutDate.matchAll(/\b\d+(?:\.\d{3})*(?:[.,]\d{1,2})?\b/g)];
  const bare=values.at(-1);
  return bare?{raw:bare[0],index:bare.index||0,length:bare[0].length}:null;
}
export function parseExpenseTextLocally(input:string,today:string,accounts:CaptureAccount[]){const transactions:CapturedTransaction[]=[];for(const original of input.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,100)){const line=stripChatPrefix(original);const amount=amountIn(line);if(!amount)continue;let amountCents:number;try{amountCents=parseMoney(amount.raw)}catch{continue}if(amountCents<=0)continue;const prefix=line.slice(0,amount.index).replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g,"").trim();const suffix=line.slice(amount.index+amount.length).trim();const account=accountFor(suffix||line,accounts);const income=/\b(recebi|renda|receita|salario|salário|entrada|ganho|pix recebido|reembolso)\b/i.test(line);const recurring=/\b(mensal|todo\s+m[eê]s|por\s+m[eê]s|recorrente)\b/i.test(line);transactions.push({date:resolveDate(line,today),description:(prefix||"Lançamento").replace(/^[-–—:]\s*/,"").slice(0,300),amountCents,type:income?"INCOME":"EXPENSE",accountId:account?.id||null,accountHint:suffix||null,confidence:account?0.93:0.82,recurring})}return transactions}
export async function extractExpenseText(input:string,today:string,accounts:CaptureAccount[]){const fallback=parseExpenseTextLocally(input,today,accounts);const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return {transactions:fallback,provider:"local" as const};try{const schema={type:"object",additionalProperties:false,properties:{transactions:{type:"array",maxItems:100,items:{type:"object",additionalProperties:false,properties:{date:{type:"string"},description:{type:"string"},amountCents:{type:"integer"},type:{type:"string",enum:["EXPENSE","INCOME","REFUND"]},accountId:{type:["string","null"]},accountHint:{type:["string","null"]},confidence:{type:"number"},recurring:{type:"boolean"}},required:["date","description","amountCents","type","accountId","accountHint","confidence","recurring"]}}},required:["transactions"]};const body={model:process.env.OPENAI_FINANCE_MODEL||"gpt-5.5",store:false,instructions:"Extraia somente transações financeiras explicitamente presentes. Não invente valores. Valores podem aparecer sem R$ quando o contexto financeiro for claro, como renda mensal 5500. Datas sem ano usam o ano da data de referência. Marque recurring=true quando o texto disser mensal, recorrente, todo mês ou equivalente. Associe accountId apenas quando o texto identificar claramente uma das contas fornecidas.",input:JSON.stringify({referenceDate:today,accounts:accounts.map(({id,name,institution,type})=>({id,name,institution,type})),text:input}),text:{format:{type:"json_schema",name:"tbb_transaction_capture",strict:true,schema}}};const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify(body)});if(!response.ok)throw new Error("openai");const json=await response.json() as {output_text?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>};const output=json.output_text||json.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;if(!output)throw new Error("output");const parsed=z.object({transactions:z.array(capturedTransactionSchema).max(100)}).parse(JSON.parse(output));return {transactions:parsed.transactions,provider:"openai" as const}}catch{return {transactions:fallback,provider:"local" as const}}}

export type CardExpenseDraft = { description: string; amountCents: number | null; date: string; accountId: string | null; merchant: string | null; categoryId: string | null; installments: number; provider: "openai" | "local" };
const CARD_FILLER = new Set(["gastei", "gasto", "paguei", "pago", "comprei", "compra", "compras", "no", "na", "nos", "nas", "em", "de", "do", "da", "com", "pelo", "pela", "um", "uma", "reais", "real", "r", "rs", "cartao", "credito", "debito", "hoje", "ontem", "anteontem", "parcelado", "parcelada", "parcelas", "vezes", "x"]);

/** Reads one card purchase written the way people talk ("uber 32 reais no picpay hoje",
 * "amazon 219,90 no itau parcelado em 3x"). It never invents an amount: no number, no amount. */
export function parseCardExpenseLocally(input: string, today: string, cards: CaptureAccount[]): CardExpenseDraft {
  let rest = ` ${input.trim()} `;
  const plain = normalized(input);
  const installmentMatch = plain.match(/\b(\d{1,2})\s*x\b/) ?? plain.match(/\bem\s+(\d{1,2})\s*(?:vezes|parcelas)\b/) ?? plain.match(/\b(\d{1,2})\s+parcelas\b/);
  const installments = Math.min(24, Math.max(1, Number(installmentMatch?.[1]) || 1));
  rest = rest.replace(/\bparcelad[oa]s?\s+em\s+\d{1,2}\s*(?:x|vezes|parcelas)?/gi, " ").replace(/\b(?:em\s+)?\d{1,2}\s*x\b/gi, " ").replace(/\b(?:em\s+)?\d{1,2}\s+(?:vezes|parcelas)\b/gi, " ");
  let date = today;
  const explicit = rest.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (explicit) {
    const year = explicit[3] ? (explicit[3].length === 2 ? `20${explicit[3]}` : explicit[3]) : today.slice(0, 4);
    try { date = normalizeDate(`${explicit[1]}/${explicit[2]}/${year}`); } catch { date = today; }
    rest = rest.replace(explicit[0], " ");
  } else if (/\banteontem\b/i.test(rest)) date = addDays(today, -2);
  else if (/\bontem\b/i.test(rest)) date = addDays(today, -1);
  const amountMatch = rest.match(/r\$\s*(\d+(?:\.\d{3})*(?:[.,]\d{1,2})?)/i)
    ?? rest.match(/(\d+(?:\.\d{3})*(?:[.,]\d{1,2})?)\s*(?:reais?|brl)\b/i)
    ?? rest.match(/(?<![\w.,])(\d+(?:\.\d{3})*,\d{1,2}|\d+\.\d{1,2})(?![\w.,])/)
    // An initial "99" (or "no 99") names the ride service, unless a currency made it an amount.
    ?? rest.replace(/(^\s*|\b(?:no|na)\s+)99(?=\s|$)/i, value => " ".repeat(value.length)).match(/(?<![\w.,])(\d+)(?![\w.,])/);
  let amountCents: number | null = null;
  if (amountMatch) {
    try { amountCents = parseMoney(amountMatch[1]); } catch { amountCents = null; }
    rest = rest.replace(amountMatch[0], " ");
  }
  const cardTerms = new Set(cards.flatMap((card) => [card.name, card.institution || ""]).flatMap((value) => normalized(value).split(/\s+/)).filter((term) => term.length >= 2));
  const words = rest.split(/\s+/).filter((word) => {
    const bare = normalized(word).replace(/[^\p{L}\p{N}]/gu, "");
    return bare && !CARD_FILLER.has(bare) && !cardTerms.has(bare);
  });
  const text = words.join(" ").replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, "");
  const description = text ? text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1) : "";
  return { description: description || "Gasto no cartão", amountCents, date, accountId: accountFor(input, cards)?.id ?? null, merchant: description && words.length <= 3 ? description : null, categoryId: null, installments, provider: "local" };
}

/** Card quick-add interpreter: GPT when configured (falling back on any failure), the local reader
 * otherwise. Known services (iFood, Uber, 99, inDrive) fill merchant and category. */
export async function interpretCardExpenseText(input: string, today: string, cards: CaptureAccount[], categories: { id: string; name: string }[]): Promise<CardExpenseDraft> {
  let draft = parseCardExpenseLocally(input, today, cards);
  if (process.env.OPENAI_API_KEY) {
    const result = await extractExpenseText(input, today, cards);
    const first = result.provider === "openai" ? result.transactions.find((item) => item.type === "EXPENSE") : undefined;
    if (first) draft = { ...draft, description: first.description, amountCents: first.amountCents, date: first.date, accountId: cards.some((card) => card.id === first.accountId) ? first.accountId : draft.accountId, provider: "openai" };
  }
  const service = smartEntryPatch(input, categories, {});
  if (service) draft = { ...draft, description: draft.provider === "local" ? service.description : draft.description, merchant: service.merchant, categoryId: service.categoryId || null };
  return draft;
}
