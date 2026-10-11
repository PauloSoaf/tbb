import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>{
  const findMany=()=>vi.fn().mockResolvedValue([]);
  return { context:vi.fn(),db:{
    financePlan:{findUnique:vi.fn().mockResolvedValue(null)},fixedExpense:{findMany:findMany()},cardStatement:{findMany:findMany()}, account:{findMany:findMany()},
    financeTransaction:{findMany:findMany(),groupBy:findMany(),findFirst:vi.fn().mockResolvedValue(null)},
    financeCategory:{findMany:findMany()},subscription:{findMany:findMany()},debt:{findMany:findMany()},savingsGoal:{findMany:findMany()},
    investmentPosition:{findMany:findMany()},investmentFixedIncomeProfile:{findMany:findMany()},$queryRaw:findMany(),
  }};
});
vi.mock("@/lib/prisma",()=>({prisma:mocks.db}));
vi.mock("@/lib/workspace",()=>({getWorkspaceContext:mocks.context}));
vi.mock("@/components/TbbCharts",()=>({CardStatementTimelineChart:()=>null}));
vi.mock("@/components/ui/ActionForm",()=>({ActionForm:()=>null}));
vi.mock("../CardExpenseDialog",()=>({CardExpenseButton:()=>null,CardExpenseDialog:()=>null}));
vi.mock("../StatementCorrectionDialog",()=>({StatementCorrectionDialog:()=>null}));
vi.mock("../CardStatementImport",()=>({CardStatementImport:()=>null}));
vi.mock("../CreditLimitBreakdown",()=>({CreditLimitBreakdown:()=>null}));
vi.mock("../actions",()=>({resolveCardStatementOverlap:vi.fn(),updateStatementLink:vi.fn()}));
import { cardStatementRows } from "../queries";
import { financeOverview } from "../overview-query";
import CardStatementsPage from "@/app/(app)/finance/statements/page";

describe("private statement reads",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("keeps monthly planning separate from actual account cash and received income",async()=>{
    mocks.db.account.findMany.mockResolvedValueOnce([{id:"cash",name:"Synthetic cash",institution:null,type:"CHECKING",initialBalanceCents:18000},{id:"reserve",name:"Synthetic reserve",institution:null,type:"SAVINGS",initialBalanceCents:6000}]);
    mocks.db.financePlan.findUnique.mockResolvedValueOnce({incomeCents:90000,payDay:20,receivingAccountId:null,receivingAccount:null});
    mocks.db.fixedExpense.findMany.mockResolvedValueOnce([{id:"fixed",name:"Synthetic recurring",amountCents:22000,dueDay:12,notes:null}]);
    const overview=await financeOverview("w1","2032-01-10");
    expect(overview.metrics).toMatchObject({incomeCents:0,cashBalanceCents:18000,reserveBalanceCents:6000,incomeReferenceCents:90000,fixedCents:22000,availableCents:68000});
    expect(mocks.db.financeTransaction.groupBy.mock.calls[0][0].where).toMatchObject({source:{not:"QUICK_INCOME"},date:{lt:new Date("2032-01-11")}});
  });
  it.each(["ADMIN","MEMBER","VIEWER"] as const)("returns no rows or database reads for %s",async role=>{
    expect(await cardStatementRows({workspaceId:"w1",role})).toEqual([]);
    expect(mocks.db.cardStatement.findMany).not.toHaveBeenCalled();
    expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();
  });
  it("calculates owner totals once, adding only purchases that increase the declared amount",async()=>{
    mocks.db.cardStatement.findMany.mockResolvedValueOnce([{id:"s1",accountId:"card",account:{name:"Synthetic"},kind:"STATEMENT",status:"OPEN",amountCents:10000,dueDate:new Date("2032-01-05"),closingDate:null,closingDay:null,referenceMonth:"2032-01",paidAt:null,reconciliation:"NOT_REQUIRED",overlapsStatementId:null,notes:null}]);
    mocks.db.financeTransaction.findMany.mockResolvedValueOnce([{cardStatementId:"s1",statementDetailMode:"ALREADY_INCLUDED",amountCents:2000},{cardStatementId:"s1",statementDetailMode:"ADDED_TO_STATEMENT",amountCents:1000}]);
    expect(await cardStatementRows({workspaceId:"w1",role:"OWNER"})).toEqual([expect.objectContaining({amountCents:11000,declaredCents:10000,addedCents:1000,detailedCents:3000,detailCount:2})]);
    expect(mocks.db.cardStatement.findMany.mock.calls[0][0].where).toEqual({workspaceId:"w1"});
    expect(mocks.db.financeTransaction.findMany.mock.calls[0][0].where.workspaceId).toBe("w1");
  });
  it.each([undefined,{workspaceId:"w2",role:"OWNER" as const},{workspaceId:"w1",role:"MEMBER" as const}])("overview excludes private statements without an owner viewer of this workspace: %j",async statementViewer=>{
    await financeOverview("w1","2032-01-01",{statementViewer});
    expect(mocks.db.cardStatement.findMany).not.toHaveBeenCalled();
    expect(mocks.db.financeTransaction.findMany.mock.calls.some(([args])=>args.where.cardStatementId?.not===null)).toBe(false);
  });
  it.each(["MEMBER","VIEWER"])("the page stops before any financial query for %s",async role=>{
    mocks.context.mockResolvedValue({workspaceId:"w1",role});
    const page=await CardStatementsPage();
    expect(page).toBeTruthy();
    expect(mocks.db.cardStatement.findMany).not.toHaveBeenCalled();
    expect(mocks.db.account.findMany).not.toHaveBeenCalled();
    expect(mocks.db.financeCategory.findMany).not.toHaveBeenCalled();
    expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();
  });
});
