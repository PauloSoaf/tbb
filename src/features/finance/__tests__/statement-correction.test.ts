import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({permission:vi.fn(),invalidate:vi.fn(),db:{
  cardStatement:{findFirst:vi.fn(),updateMany:vi.fn().mockResolvedValue({count:1})},
  financeTransaction:{findMany:vi.fn()},activityEvent:{create:vi.fn()},$transaction:vi.fn(),
}}));
vi.mock("@/lib/prisma",()=>({prisma:mocks.db}));
vi.mock("@/lib/workspace",()=>({requirePermission:mocks.permission}));
vi.mock("next/cache",()=>({revalidatePath:mocks.invalidate}));
import { correctCardStatement } from "../statement-actions";
const before={id:"bill",workspaceId:"own",accountId:"card",kind:"STATEMENT",status:"OPEN",amountCents:15000,dueDate:new Date("2032-01-12"),closingDate:null,closingDay:4,referenceMonth:"2032-01",notes:null,updatedAt:new Date("2032-01-01")};
function form(patch:Record<string,string|undefined>={}){const fd=new FormData();for(const [key,value] of Object.entries({id:"bill",version:before.updatedAt.toISOString(),amount:"150,00",dueDate:"2032-01-15",closingDate:"2032-01-06",closingDay:"4",referenceMonth:"2032-01",notes:"Synthetic correction",...patch}))if(value!==undefined)fd.set(key,value);return fd;}
describe("owner statement corrections",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.permission.mockResolvedValue({workspaceId:"own",userId:"owner",role:"OWNER"});mocks.db.cardStatement.findFirst.mockReset().mockResolvedValueOnce(before).mockResolvedValue(null);mocks.db.financeTransaction.findMany.mockResolvedValue([]);mocks.db.$transaction.mockImplementation((fn:(tx:typeof mocks.db)=>unknown)=>fn(mocks.db));});
  it("corrects dates and the natural key in place, retaining linked purchases and auditing the change",async()=>{
    expect(await correctCardStatement(form())).toHaveProperty("success");
    expect(mocks.db.cardStatement.updateMany).toHaveBeenCalledWith({where:{id:"bill",workspaceId:"own"},data:expect.objectContaining({periodKey:"due:2032-01-15",dueDate:new Date("2032-01-15"),closingDate:new Date("2032-01-06"),closingDay:6,amountCents:15000})});
    expect(mocks.db.activityEvent.create.mock.calls[0][0].data).toMatchObject({workspaceId:"own",actorUserId:"owner",type:"statement.corrected",metadata:{before:{amountCents:15000},after:{amountCents:15000}}});
    expect(mocks.db.$transaction.mock.calls[0][1]).toMatchObject({isolationLevel:"Serializable"});
  });
  it.each(["ADMIN","MEMBER","VIEWER"])("rejects %s before querying private statements",async role=>{mocks.permission.mockResolvedValueOnce({workspaceId:"own",role});expect(await correctCardStatement(form())).toHaveProperty("error");expect(mocks.db.cardStatement.findFirst).not.toHaveBeenCalled();});
  it("uses only the session workspace",async()=>{await correctCardStatement(form({workspaceId:"foreign"}));expect(mocks.db.cardStatement.findFirst.mock.calls[0][0].where).toEqual({id:"bill",workspaceId:"own"});});
  it.each([{closingDate:"2032-01-16"},{dueDate:"2032-02-30"},{version:"outdated"},{amount:"-10"},{closingDay:"32"}])("rejects inconsistent or stale inputs %j",async patch=>{expect(await correctCardStatement(form(patch))).toHaveProperty("error");expect(mocks.db.cardStatement.updateMany).not.toHaveBeenCalled();expect(mocks.db.activityEvent.create).not.toHaveBeenCalled();});
  it("never changes paid statements",async()=>{mocks.db.cardStatement.findFirst.mockReset().mockResolvedValueOnce({...before,status:"PAID"});expect(await correctCardStatement(form())).toMatchObject({error:expect.stringContaining("paga")});expect(mocks.db.cardStatement.updateMany).not.toHaveBeenCalled();});
  it("rejects corrections below existing detail",async()=>{mocks.db.financeTransaction.findMany.mockResolvedValueOnce([{amountCents:16000,statementDetailMode:"ALREADY_INCLUDED"},{amountCents:2000,statementDetailMode:"ADDED_TO_STATEMENT"}]);expect(await correctCardStatement(form())).toHaveProperty("error");expect(mocks.db.cardStatement.updateMany).not.toHaveBeenCalled();});
  it("keeps added purchases separate from the bank's declared amount",async()=>{mocks.db.financeTransaction.findMany.mockResolvedValueOnce([{amountCents:14000,statementDetailMode:"ALREADY_INCLUDED"},{amountCents:2000,statementDetailMode:"ADDED_TO_STATEMENT"}]);expect(await correctCardStatement(form())).toHaveProperty("success");expect(mocks.db.cardStatement.updateMany.mock.calls[0][0].data.amountCents).toBe(15000);});
  it("blocks another bill with the corrected natural key",async()=>{mocks.db.cardStatement.findFirst.mockReset().mockResolvedValueOnce(before).mockResolvedValueOnce({id:"another"});expect(await correctCardStatement(form())).toHaveProperty("error");expect(mocks.db.cardStatement.updateMany).not.toHaveBeenCalled();});
  it("keeps forecasts without a due date",async()=>{mocks.db.cardStatement.findFirst.mockReset().mockResolvedValueOnce({...before,kind:"MONTHLY_PROJECTION",status:"FORECAST"}).mockResolvedValue(null);expect(await correctCardStatement(form({referenceMonth:"2032-02"}))).toHaveProperty("success");expect(mocks.db.cardStatement.updateMany.mock.calls[0][0].data).toMatchObject({dueDate:null,closingDate:null,closingDay:null,periodKey:"month:2032-02"});});
});
