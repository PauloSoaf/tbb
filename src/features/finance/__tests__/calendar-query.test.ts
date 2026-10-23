vi.mock("../data-origin-request",()=>({currentFinanceOrigin:async()=>"combined"}));
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({db:{financeTransaction:{findMany:vi.fn()},financialEvidence:{count:vi.fn().mockResolvedValue(0)},account:{findMany:vi.fn().mockResolvedValue([])},financeCategory:{findMany:vi.fn().mockResolvedValue([])}},context:vi.fn(),permission:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/prisma",()=>({prisma:mocks.db}));
vi.mock("@/lib/workspace",()=>({getCurrentTenantContext:mocks.context,requirePermission:mocks.permission,AuthorizationError:class extends Error{}}));
import { financeCalendarMonth, financeCalendarOptions } from "../calendar-query";
import { GET } from "@/app/api/finance/calendar/route";
import { AuthorizationError } from "@/lib/workspace";
const entry={id:"purchase",date:new Date("2032-02-29"),description:"Synthetic card expense",merchant:null,amountCents:2400,type:"EXPENSE",source:"MANUAL",cardStatementId:"private-bill",account:{name:"Synthetic card",type:"CREDIT_CARD"},category:null};
describe("calendar workspace reads",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.db.financialEvidence.count.mockResolvedValue(0);mocks.db.financeTransaction.findMany.mockResolvedValue([entry]);mocks.context.mockResolvedValue({workspaceId:"own"});mocks.permission.mockResolvedValue({workspaceId:"own",role:"OWNER"});});
  it("shows pending bank imports separately from confirmed totals and only to the owner",async()=>{mocks.db.financialEvidence.count.mockResolvedValue(4);expect((await financeCalendarMonth("own","2032-02",true)).pendingOpenFinanceCount).toBe(4);expect(mocks.db.financialEvidence.count.mock.calls[0][0].where).toMatchObject({workspaceId:"own",decision:"NEEDS_REVIEW"});vi.clearAllMocks();expect((await financeCalendarMonth("own","2032-02",false)).pendingOpenFinanceCount).toBeUndefined();expect(mocks.db.financialEvidence.count).not.toHaveBeenCalled();});
  it("reads a bounded UTC month from the ledger, excluding unconfirmed income",async()=>{
    expect((await financeCalendarMonth("own","2032-02",true)).entries).toEqual([expect.objectContaining({day:"2032-02-29",amountCents:2400,isCardPurchase:true,cardStatementId:"private-bill"})]);
    expect(mocks.db.financeTransaction.findMany.mock.calls[0][0].where).toEqual({workspaceId:"own",isConsumption:true,date:{gte:new Date("2032-02-01"),lt:new Date("2032-03-01")},source:{not:"QUICK_INCOME"},AND:{}});
  });
  it("omits private statement identifiers for other roles",async()=>{expect((await financeCalendarMonth("own","2032-02")).entries[0].cardStatementId).toBeNull();});
  it("rejects invalid months before querying",async()=>{await expect(financeCalendarMonth("own","2032-13")).rejects.toThrow();expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();});
  it("filters account and category options to active records of this workspace",async()=>{await financeCalendarOptions("own");expect(mocks.db.account.findMany.mock.calls[0][0].where).toMatchObject({workspaceId:"own",isArchived:false,currency:"BRL"});expect(mocks.db.financeCategory.findMany.mock.calls[0][0].where).toEqual({workspaceId:"own",isArchived:false});});
  it("requires login without querying",async()=>{mocks.context.mockResolvedValueOnce(null);expect((await GET(new Request("http://example.test/api/finance/calendar?month=2032-02"))).status).toBe(401);expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();});
  it("requires READ and ignores workspace ids from the request",async()=>{const response=await GET(new Request("http://example.test/api/finance/calendar?month=2032-02&workspaceId=foreign"));expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toContain("no-store");expect(mocks.permission).toHaveBeenCalledWith("READ");expect(mocks.db.financeTransaction.findMany.mock.calls[0][0].where.workspaceId).toBe("own");});
  it("returns 403 when reading was denied",async()=>{mocks.permission.mockRejectedValueOnce(new AuthorizationError());expect((await GET(new Request("http://example.test/api/finance/calendar?month=2032-02"))).status).toBe(403);expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();});
  it("returns 400 for an invalid month",async()=>{expect((await GET(new Request("http://example.test/api/finance/calendar?month=9998-12"))).status).toBe(400);expect(mocks.db.financeTransaction.findMany).not.toHaveBeenCalled();});
});
