import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({permission:vi.fn(),accountRef:vi.fn(),statementRef:vi.fn(),linked:vi.fn(),create:vi.fn(),purchase:vi.fn(),update:vi.fn(),accountUpdate:vi.fn(),statementCount:vi.fn(),audit:vi.fn(),transaction:vi.fn(),purchaseCount:vi.fn(),deletePurchases:vi.fn(),accountCount:vi.fn(),categoryCount:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/tenancy/requirePermission",()=>({requirePermission:mocks.permission,AuthorizationError:class AuthorizationError extends Error{}}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction,account:{findFirst:mocks.accountRef,count:mocks.accountCount},financeCategory:{count:mocks.categoryCount},financeTransaction:{findFirst:mocks.purchase,updateMany:mocks.update}}}));
import { bulkTransactions, saveAccount, saveCardExpense, saveGridTransactions, saveTransaction, updateStatementLink, updateTransactionCell } from "../actions";
const ctx=(role="OWNER")=>({workspaceId:"w1",userId:"u1",role,workspace:{timezone:"America/Manaus"}});
const form=(entries:Record<string,string>)=>{const fd=new FormData();Object.entries(entries).forEach(([key,value])=>fd.set(key,value));return fd;};
const expense=(patch:Record<string,string>={})=>form({accountId:"card",amount:"10,00",description:"Synthetic purchase",date:"2032-01-31",installments:"3",link:"ALREADY_INCLUDED",statementId:"s1",...patch});
const statement=(patch:Record<string,unknown>={})=>({id:"s1",status:"OPEN",amountCents:10000,dueDate:new Date("2032-02-05"),referenceMonth:"2032-02",...patch});

beforeEach(()=>{
  vi.resetAllMocks();mocks.permission.mockResolvedValue(ctx());mocks.accountRef.mockResolvedValue({id:"card",name:"Synthetic card",type:"CREDIT_CARD"});mocks.statementRef.mockResolvedValue(statement());mocks.linked.mockResolvedValue([]);mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",amountCents:1000,type:"EXPENSE",cardStatementId:null,statementDetailMode:null});mocks.update.mockResolvedValue({count:1});mocks.accountUpdate.mockResolvedValue({count:1});mocks.statementCount.mockResolvedValue(0);let count=0;mocks.create.mockImplementation(async()=>({id:`purchase-${++count}`}));
  mocks.purchaseCount.mockResolvedValue(1);mocks.accountCount.mockResolvedValue(1);mocks.categoryCount.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async(fn: (tx:unknown)=>unknown)=>fn({cardStatement:{findFirst:mocks.statementRef,count:mocks.statementCount},financeTransaction:{findMany:mocks.linked,create:mocks.create,findFirst:mocks.purchase,updateMany:mocks.update,update:mocks.update,count:mocks.purchaseCount,deleteMany:mocks.deletePurchases},account:{updateMany:mocks.accountUpdate},activityEvent:{create:mocks.audit}}));
});

describe("statement integrity across existing ledger edit paths",()=>{
  const paidPurchase={id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ADDED_TO_STATEMENT"};
  it("protects paid bill additions from edits through the detailed transaction form",async()=>{
    mocks.purchase.mockResolvedValue(paidPurchase);mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await saveTransaction(form({id:"purchase",accountId:"card",description:"Synthetic",date:"2032-01-31",amount:"20,00"}))).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("protects paid bill additions from grid batch edits",async()=>{
    mocks.linked.mockResolvedValueOnce([paidPurchase]);mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await saveGridTransactions([{id:"purchase",accountId:"card",description:"Synthetic",date:"2032-01-31",amount:"20,00",type:"EXPENSE"}])).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("protects paid bill additions from bulk deletion",async()=>{
    mocks.linked.mockResolvedValueOnce([paidPurchase]);mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await bulkTransactions(form({ids:"purchase",operation:"DELETE",confirmation:"EXCLUIR"}))).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.deletePurchases).not.toHaveBeenCalled();
  });
  it("allows metadata changes on paid additions without changing any statement total",async()=>{
    mocks.purchase.mockResolvedValue(paidPurchase);
    expect(await updateTransactionCell({id:"purchase",field:"description",value:"New synthetic description"})).toHaveProperty("success");
    expect(mocks.statementRef).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].data).toEqual({description:"New synthetic description",revision:{increment:1}});
  });
});

describe("partial account updates",()=>{
  it("writes only submitted fields and ignores the client's workspace",async()=>{
    expect(await saveAccount(form({id:"card",name:"Renamed synthetic card",workspaceId:"w2"}))).toEqual({success:"Conta salva."});
    expect(mocks.accountUpdate).toHaveBeenCalledWith({where:{id:"card",workspaceId:"w1"},data:{name:"Renamed synthetic card"}});
    expect(mocks.statementCount).not.toHaveBeenCalled();
  });
  it("allows clearing submitted optional values without clearing the remaining values",async()=>{
    await saveAccount(form({id:"card",closingDay:"",creditLimit:""}));
    expect(mocks.accountUpdate.mock.calls[0][0].data).toEqual({closingDay:null,creditLimitCents:null});
  });
  it("refuses converting a card with registered statements into another account type",async()=>{
    mocks.statementCount.mockResolvedValue(1);
    expect(await saveAccount(form({id:"card",type:"CHECKING"}))).toMatchObject({error:expect.stringContaining("tipo da conta")});
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });
});

describe("card expense writes",()=>{
  it("splits exact cents, clamps month ends and links only the first installment",async()=>{
    const result=await saveCardExpense(expense({workspaceId:"w2"}));
    expect(result).toHaveProperty("success");
    const rows=mocks.create.mock.calls.map(([args])=>args.data);
    expect(rows.map(row=>row.amountCents)).toEqual([334,333,333]);
    expect(rows.map(row=>row.date.toISOString().slice(0,10))).toEqual(["2032-01-31","2032-02-29","2032-03-31"]);
    expect(rows.map(row=>row.cardStatementId??null)).toEqual(["s1",null,null]);
    expect(rows.every(row=>row.workspaceId==="w1")).toBe(true);
    expect(rows[0].statementDetailMode).toBe("ALREADY_INCLUDED");
    expect(mocks.transaction.mock.calls[0][1]).toEqual({isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  });
  it.each(["MEMBER","VIEWER","ADMIN"])("refuses linking for %s before reading statements",async role=>{
    mocks.permission.mockResolvedValue(ctx(role));
    expect(await saveCardExpense(expense())).toMatchObject({error:expect.stringContaining("titular")});
    expect(mocks.statementRef).not.toHaveBeenCalled();expect(mocks.create).not.toHaveBeenCalled();
  });
  it("allows an unlinked purchase for an authorized member",async()=>{
    mocks.permission.mockResolvedValue(ctx("MEMBER"));
    expect(await saveCardExpense(expense({link:"NONE"}))).toHaveProperty("success");
    expect(mocks.statementRef).not.toHaveBeenCalled();expect(mocks.create.mock.calls.every(([args])=>!args.data.cardStatementId)).toBe(true);
  });
  it("refuses another card's statement or another tenant",async()=>{
    mocks.statementRef.mockResolvedValue(null);
    expect(await saveCardExpense(expense())).toMatchObject({error:expect.stringContaining("não pertence")});
    expect(mocks.statementRef.mock.calls[0][0].where).toEqual({id:"s1",workspaceId:"w1",accountId:"card"});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the effective total including prior additions and prevents excessive detail",async()=>{
    mocks.linked.mockResolvedValue([{amountCents:9000,statementDetailMode:"ALREADY_INCLUDED"},{amountCents:1000,statementDetailMode:"ADDED_TO_STATEMENT"}]);
    expect(await saveCardExpense(expense({amount:"20,00",installments:"1"}))).toMatchObject({error:expect.stringContaining("acima do total")});
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await saveCardExpense(expense({amount:"20,00",installments:"1",link:"ADDED_TO_STATEMENT"}))).toHaveProperty("success");
    expect(mocks.audit.mock.calls[0][0].data.metadata).toMatchObject({statementTotalBefore:11000,statementTotalAfter:13000});
  });
  it("keeps paid bills immutable",async()=>{
    mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await saveCardExpense(expense({link:"ADDED_TO_STATEMENT"}))).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuses installment plans that create zero-cent purchases",async()=>{
    expect(await saveCardExpense(expense({amount:"0,01",installments:"3"}))).toMatchObject({error:expect.stringContaining("um centavo")});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reports fingerprint duplicates as P2002 with no audit",async()=>{
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Synthetic duplicate",{code:"P2002",clientVersion:"6"}));
    expect(await saveCardExpense(expense())).toEqual({error:"Este gasto já foi lançado (mesma data, descrição e valor)."});
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});

describe("updating a statement link",()=>{
  it("excludes the purchase itself when checking a new classification",async()=>{
    expect(await updateStatementLink(form({transactionId:"purchase",statementId:"s1",mode:"ALREADY_INCLUDED",workspaceId:"w2"}))).toHaveProperty("success");
    expect(mocks.linked.mock.calls[0][0].where).toEqual({workspaceId:"w1",cardStatementId:"s1",type:"EXPENSE",id:{not:"purchase"}});
    expect(mocks.update.mock.calls[0][0]).toMatchObject({where:{id:"purchase",workspaceId:"w1"},data:{cardStatementId:"s1",statementDetailMode:"ALREADY_INCLUDED",revision:{increment:1}}});
  });
  it("unlinks both fields together",async()=>{
    expect(await updateStatementLink(form({transactionId:"purchase",statementId:""}))).toHaveProperty("success");
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({cardStatementId:null,statementDetailMode:null});
  });
  it.each(["MEMBER","VIEWER"])("restricts relinking to the owner: %s",async role=>{
    mocks.permission.mockResolvedValue(ctx(role));
    expect(await updateStatementLink(form({transactionId:"purchase",statementId:"s1",mode:"ADDED_TO_STATEMENT"}))).toHaveProperty("error");
    expect(mocks.purchase).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects purchases outside the session workspace and foreign-card statements",async()=>{
    mocks.purchase.mockResolvedValueOnce(null);
    expect(await updateStatementLink(form({transactionId:"other",statementId:"s1",mode:"ALREADY_INCLUDED"}))).toHaveProperty("error");
    mocks.statementRef.mockResolvedValue(null);
    expect(await updateStatementLink(form({transactionId:"purchase",statementId:"other",mode:"ALREADY_INCLUDED"}))).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("detaches both link fields when a purchase moves accounts through cell editing",async()=>{
    mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ALREADY_INCLUDED"});
    expect(await updateTransactionCell({id:"purchase",field:"accountId",value:"other-card"})).toHaveProperty("success");
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({accountId:"other-card",cardStatementId:null,statementDetailMode:null});
  });
  it.each(["", "s2"])("prevents removing a paid bill's added purchase through relinking to %s",async statementId=>{
    mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ADDED_TO_STATEMENT"});
    mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await updateStatementLink(form({transactionId:"purchase",statementId,mode:"ALREADY_INCLUDED"}))).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([
    {field:"amount" as const,value:"20,00"},
    {field:"accountId" as const,value:"other-card"},
    {field:"type" as const,value:"REFUND" as const},
  ])("prevents changing a paid bill's effective total through cell $field",async change=>{
    mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ADDED_TO_STATEMENT"});
    mocks.statementRef.mockResolvedValue(statement({status:"PAID"}));
    expect(await updateTransactionCell({id:"purchase",...change})).toMatchObject({error:expect.stringContaining("já foi paga")});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("prevents cell edits from exceeding an included purchase's statement total",async()=>{
    mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ALREADY_INCLUDED"});
    mocks.linked.mockResolvedValue([{amountCents:9000,statementDetailMode:"ALREADY_INCLUDED"}]);
    expect(await updateTransactionCell({id:"purchase",field:"amount",value:"10,01"})).toMatchObject({error:expect.stringContaining("acima do total")});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not let members alter the amount of a linked purchase",async()=>{
    mocks.permission.mockResolvedValue(ctx("MEMBER"));
    mocks.purchase.mockResolvedValue({id:"purchase",accountId:"card",type:"EXPENSE",amountCents:1000,cardStatementId:"s1",statementDetailMode:"ALREADY_INCLUDED"});
    expect(await updateTransactionCell({id:"purchase",field:"amount",value:"20,00"})).toMatchObject({error:expect.stringContaining("titular")});
    expect(mocks.statementRef).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled();
  });
});
