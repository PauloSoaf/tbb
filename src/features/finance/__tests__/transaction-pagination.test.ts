vi.mock("../data-origin-request",()=>({currentFinanceOrigin:async()=>"combined"}));
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({permission:vi.fn(),count:vi.fn(),rows:vi.fn(),accounts:vi.fn(),categories:vi.fn()}));
vi.mock("@/lib/workspace",()=>({requirePermission:mocks.permission,AuthorizationError:class extends Error{}}));
vi.mock("@/lib/prisma",()=>({prisma:{financeTransaction:{count:mocks.count,findMany:mocks.rows},account:{findMany:mocks.accounts},financeCategory:{findMany:mocks.categories}}}));
vi.mock("../FinanceDataGrid",()=>({FinanceDataGrid:({initialRows}:{initialRows:{id:string}[]})=>createElement("div",null,initialRows.map(row=>createElement("span",{"data-transaction-id":row.id,key:row.id})))}));
vi.mock("../FinanceTransactionFilters",()=>({FinanceTransactionFilters:()=>null}));
import Page from "@/app/(app)/finance/transactions/page";
import { AuthorizationError } from "@/lib/workspace";
import { transactionPage, transactionWhere } from "../transaction-filters";
import { financePageAccess } from "../finance-page-access";

const row=(id:string,type:string)=>({id,type,amountCents:1200,date:new Date("2032-10-10"),description:id,merchant:null,accountId:"bank",destinationAccountId:type==="TRANSFER"?"reserve":null,tags:[],source:"MANUAL",notes:null,createdAt:new Date("2032-10-10"),updatedAt:new Date("2032-10-10")});
beforeEach(()=>{vi.clearAllMocks();mocks.permission.mockResolvedValue({workspaceId:"w1",role:"OWNER",workspace:{timezone:"UTC"}});mocks.accounts.mockResolvedValue([{id:"bank",name:"Bank"},{id:"reserve",name:"Reserve"}]);mocks.categories.mockResolvedValue([]);mocks.count.mockResolvedValue(101);mocks.rows.mockResolvedValue([row("expense","EXPENSE"),row("transfer","TRANSFER")]);});
describe("transaction paging and effective permissions",()=>{
 it.each([undefined,"0","-1","1.5","Infinity","NaN","1e5", "999999999999999999999"])("rejects malformed page %s",value=>expect(transactionPage(value)).toBe(1));
 it("bounds positive integer offsets",()=>{expect(transactionPage("2")).toBe(2);expect(transactionPage("999999")).toBe(1000)});
 it("counts and queries exactly the same universe and keeps transfers visible on their page",async()=>{
  const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({page:"2"})}));
  expect(mocks.rows.mock.calls[0][0]).toMatchObject({where:mocks.count.mock.calls[0][0].where,skip:100,take:100});
  expect(html.match(/data-transaction-id=/g)).toHaveLength(2);expect(html).toContain('data-transaction-id="transfer"');expect(html).toContain("Transferência");expect(html).toContain("Reserve");
 });
 it("retains the transfer filter for both counting and display",async()=>{
  mocks.rows.mockResolvedValue([row("transfer","TRANSFER")]);const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({type:"TRANSFER"})}));
  expect(mocks.count.mock.calls[0][0].where).toMatchObject(transactionWhere("w1",{type:"TRANSFER"}));expect(mocks.rows.mock.calls[0][0].where.type).toBe("TRANSFER");expect(html).toContain('data-transaction-id="transfer"');
 });
 it("denies READ before any financial query",async()=>{
  mocks.permission.mockRejectedValue(new AuthorizationError());await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow();expect(mocks.rows).not.toHaveBeenCalled();expect(mocks.count).not.toHaveBeenCalled();expect(mocks.accounts).not.toHaveBeenCalled();
 });
 it("honours a WRITE denial while leaving read-only transactions available",async()=>{
  mocks.permission.mockImplementation(async p=>{if(p==="WRITE")throw new AuthorizationError();return{workspaceId:"w1",role:"VIEWER",workspace:{timezone:"UTC"}}});
  const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));expect(html).toContain("somente leitura");expect(html).not.toContain('href="/finance/imports"');expect(html.match(/data-transaction-id=/g)).toHaveLength(2);
 });
 it("does not mask permission infrastructure failures as read-only access",async()=>{
  mocks.permission.mockResolvedValueOnce({workspaceId:"w1",role:"MEMBER"}).mockRejectedValueOnce(new Error("Database unavailable"));await expect(financePageAccess()).rejects.toThrow("Database unavailable");
 });
});
