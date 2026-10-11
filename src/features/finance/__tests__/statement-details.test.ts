import { describe, expect, it, vi } from "vitest";
import { cardCycleSuggestion, statementAlerts, statementClosing, statementLinkError, suggestStatementForPurchase, summarizeCardStatements, type StatementRow } from "../card-statements";
import { interpretCardExpenseText, parseCardExpenseLocally } from "../natural-language";

const row=(patch:Partial<StatementRow>={}):StatementRow=>({id:"jan",accountId:"card",accountName:"Synthetic",kind:"STATEMENT",status:"OPEN",amountCents:10000,dueDate:"2032-01-05",closingDate:"2031-12-28",closingDay:null,referenceMonth:"2032-01",paidAt:null,reconciliation:"NOT_REQUIRED",overlapsStatementId:null,notes:null,...patch});
const feb=row({id:"feb",status:"FUTURE_KNOWN",dueDate:"2032-02-05",closingDate:"2032-01-28"});

describe("purchase statement suggestion",()=>{
  it("uses stored closing dates exactly",()=>expect(statementClosing(row(),[row()])).toEqual({date:"2031-12-28",estimated:false}));
  it("derives closing day across years, clamping short months",()=>{
    expect(statementClosing(row({closingDate:null,closingDay:28}),[])).toEqual({date:"2031-12-28",estimated:true});
    expect(statementClosing(row({dueDate:"2032-03-05",closingDate:null,closingDay:31}),[])).toEqual({date:"2032-02-29",estimated:true});
  });
  it("estimates a missing closing from an observed gap and refuses forecasts",()=>{
    expect(statementClosing({...feb,closingDate:null},[row()])).toEqual({date:"2032-01-28",estimated:true});
    expect(statementClosing(row({closingDate:null}),[])).toBeNull();
    expect(statementClosing(row({kind:"MONTHLY_PROJECTION",dueDate:null}),[row()])).toBeNull();
  });
  it("places purchases on the closing day in the next bill and respects card and window",()=>{
    expect(suggestStatementForPurchase([feb,row()],"card","2031-12-27")?.statementId).toBe("jan");
    expect(suggestStatementForPurchase([feb,row()],"card","2031-12-28")?.statementId).toBe("feb");
    expect(suggestStatementForPurchase([feb,row()],"other","2031-12-27")).toBeNull();
    expect(suggestStatementForPurchase([feb,row()],"card","2031-11-27")).toBeNull();
    expect(suggestStatementForPurchase([feb,row()],"card","2032-01-28")).toBeNull();
  });
});

describe("statement detail integrity and recurring cycle",()=>{
  it("keeps paid bills immutable and allows detail only up to the effective total",()=>{
    const paid={status:"PAID" as const,amountCents:10000,detailedCents:9000};
    expect(statementLinkError(paid,"ADDED_TO_STATEMENT",1)).toContain("já foi paga");
    expect(statementLinkError(paid,"ALREADY_INCLUDED",1000)).toBeNull();
    expect(statementLinkError(paid,"ALREADY_INCLUDED",1001)).toContain("acima do total");
    expect(statementLinkError({...paid,status:"OPEN"},"ADDED_TO_STATEMENT",3000)).toBeNull();
  });
  it("suggests the most frequent days, breaking ties with the newest bill",()=>{
    expect(cardCycleSuggestion([])).toBeNull();
    expect(cardCycleSuggestion([row(),feb,row({id:"mar",dueDate:"2032-03-06",closingDate:null,closingDay:27})])).toEqual({closingDay:28,dueDay:5,statements:3});
    expect(cardCycleSuggestion([row(),row({id:"feb",dueDate:"2032-02-06",closingDate:null,closingDay:27})])).toEqual({closingDay:27,dueDay:6,statements:2});
  });
});

describe("actionable statement alerts",()=>{
  const context={today:"2032-01-05",monthlyIncomeCents:0,cardsWithoutLimit:[]};
  it("prioritizes overdue, imminent and pending alerts and limits the result to five",()=>{
    const rows=[row({id:"overdue",dueDate:"2032-01-04"}),row({id:"today"}),row({id:"seven",dueDate:"2032-01-12"}),row({id:"eight",dueDate:"2032-01-13"}),row({id:"pending",kind:"MONTHLY_PROJECTION",status:"FORECAST",dueDate:null,reconciliation:"PENDING",referenceMonth:"2032-02"})];
    const alerts=statementAlerts(summarizeCardStatements(rows,context.today),{...context,cardsWithoutLimit:["Synthetic"]});
    expect(alerts[0]).toMatchObject({id:"overdue-overdue",tone:"danger",href:"#fatura-overdue"});
    expect(alerts.some(a=>a.id==="soon-today"&&a.title.includes("hoje"))).toBe(true);
    expect(alerts.some(a=>a.id==="soon-seven")).toBe(true);
    expect(alerts.some(a=>a.id==="soon-eight")).toBe(false);
    expect(alerts.some(a=>a.id==="pending-pending")).toBe(true);
    expect(alerts).toHaveLength(5);
  });
  it("uses 70% and 100% income bands, excludes paid and included forecasts",()=>{
    for(const [amountCents,tone] of [[6999,null],[7000,"warning"],[10000,"danger"]] as const){
      const rows=[row({amountCents,dueDate:"2032-01-25"}),row({id:"paid",status:"PAID",amountCents:99999}),row({id:"included",status:"FORECAST",kind:"MONTHLY_PROJECTION",dueDate:null,reconciliation:"INCLUDED_IN_STATEMENT",amountCents:99999})];
      const income=statementAlerts(summarizeCardStatements(rows,context.today),{...context,monthlyIncomeCents:10000}).find(a=>a.id==="income-2032-01");
      expect(income?.tone??null).toBe(tone);
    }
  });
  it("reports concentration, a peak month and missing limits when income is absent",()=>{
    const rows=[row({amountCents:20000,dueDate:"2032-01-25"}),row({id:"other",accountId:"other",amountCents:10000,dueDate:"2032-02-25"})];
    const ids=statementAlerts(summarizeCardStatements(rows,context.today),{...context,cardsWithoutLimit:["Synthetic"]}).map(a=>a.id);
    expect(ids).toEqual(expect.arrayContaining(["concentration","peak-2032-01","limits"]));
  });
});

const cards=[{id:"nu",name:"Nubank",institution:"Nubank",type:"CREDIT_CARD"},{id:"pic",name:"PicPay",institution:"PicPay",type:"CREDIT_CARD"},{id:"itau",name:"Itaú",institution:"Itaú",type:"CREDIT_CARD"}];
describe("local card expense parser",()=>{
  it.each([
    ["gastei 89,90 no ifood ontem no nubank",8990,"nu","2031-12-31",1,"Ifood"],
    ["uber 32 reais no picpay hoje",3200,"pic","2032-01-01",1,"Uber"],
    ["amazon 219,90 no itau parcelado em 3x",21990,"itau","2032-01-01",3,"Amazon"],
    ["uber R$ 12,34 no picpay 31/12/31",1234,"pic","2031-12-31",1,"Uber"],
    ["99 32 reais no nubank 02/01",3200,"nu","2032-01-02",1,"99"],
    ["99 no nubank hoje",null,"nu","2032-01-01",1,"99"],
  ])("parses %s",(text,amountCents,accountId,date,installments,description)=>{
    expect(parseCardExpenseLocally(String(text),"2032-01-01",cards)).toMatchObject({amountCents,accountId,date,installments,description,provider:"local"});
  });
  it("fills known service and category locally without calling an external provider",async()=>{
    vi.stubEnv("OPENAI_API_KEY","");
    try { expect(await interpretCardExpenseText("99 32 reais no nubank hoje","2032-01-01",cards,[{id:"transport",name:"Transporte"}])).toMatchObject({amountCents:3200,merchant:"99",categoryId:"transport",provider:"local"}); }
    finally {vi.unstubAllEnvs();}
  });
});
