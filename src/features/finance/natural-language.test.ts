import {describe,expect,it} from "vitest";
import {parseExpenseTextLocally} from "./natural-language";

const accounts=[
  {id:"itau-credit",name:"Itaú crédito",institution:"Itaú",type:"CREDIT_CARD"},
  {id:"nubank-debit",name:"Nubank débito",institution:"Nubank",type:"CHECKING"},
];

describe("captura financeira por texto",()=>{
  it("interpreta linhas livres e associa contas citadas",()=>{
    const result=parseExpenseTextLocally("uber 29 reais\nuber 43 reais itau credito\nuber 22 reais nubank debito","2026-09-13",accounts);
    expect(result).toHaveLength(3);
    expect(result.map(item=>item.amountCents)).toEqual([2900,4300,2200]);
    expect(result[1].accountId).toBe("itau-credit");
    expect(result[2].accountId).toBe("nubank-debit");
    expect(result[0].accountId).toBeNull();
  });

  it("prioriza o meio de pagamento citado quando a mesma instituição tem conta e cartão",()=>{
    const sameInstitution=[
      {id:"itau-checking",name:"Itaú",institution:"Itaú",type:"CHECKING"},
      {id:"itau-card",name:"Itaú",institution:"Itaú",type:"CREDIT_CARD"},
    ];
    const result=parseExpenseTextLocally("uber 22 reais itau credito\nmercado 80 reais itau debito","2026-09-15",sameInstitution);
    expect(result[0].accountId).toBe("itau-card");
    expect(result[1].accountId).toBe("itau-checking");
  });

  it("associa o único cartão quando o texto diz crédito sem nomear a instituição",()=>{
    const result=parseExpenseTextLocally("uber 22 reais no credito","2026-09-15",accounts);
    expect(result[0].accountId).toBe("itau-credit");
  });

  it("aceita renda mensal sem símbolo de moeda",()=>{
    expect(parseExpenseTextLocally("renda mensal 5500","2026-09-14",accounts)).toEqual([
      expect.objectContaining({description:"renda mensal",amountCents:550000,type:"INCOME",recurring:true}),
    ]);
  });

  it("remove metadados de mensagem do WhatsApp e mantém a data",()=>{
    const text="[13/09, 08:48] Paulo Amorim: uber 29 reais\n[13/09, 08:48] Paulo Amorim: uber 43 reais itau credito";
    const result=parseExpenseTextLocally(text,"2026-09-13",accounts);
    expect(result.map(item=>item.description)).toEqual(["uber","uber"]);
    expect(result.map(item=>item.date)).toEqual(["2026-09-13","2026-09-13"]);
  });
});
