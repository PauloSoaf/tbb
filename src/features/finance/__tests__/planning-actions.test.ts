import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({permission:vi.fn(),account:vi.fn(),plan:vi.fn(),create:vi.fn(),fixed:vi.fn(),fixedUpdate:vi.fn(),transaction:vi.fn(),audit:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/tenancy/requirePermission',()=>({requirePermission:mocks.permission,AuthorizationError:class extends Error{}}));
vi.mock('@/lib/prisma',()=>({prisma:{$transaction:mocks.transaction,account:{findFirst:mocks.account},fixedExpense:{updateMany:mocks.fixedUpdate}}}));
import {archiveFixedExpense,receiveMonthlyIncome,saveFixedExpense,saveMonthlyIncome} from '../actions';
import {exportFinancialReport} from '../report-actions';
vi.mock('server-only',()=>({}));
const form=(fields:Record<string,string>)=>{const fd=new FormData();for(const [key,value]of Object.entries(fields))fd.set(key,value);return fd;};
beforeEach(()=>{
  vi.resetAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date('2032-01-10T16:00:00Z'));
  mocks.permission.mockResolvedValue({workspaceId:'synthetic',userId:'owner',role:'OWNER',workspace:{timezone:'America/Manaus'}});
  mocks.account.mockResolvedValue({id:'cash',type:'CHECKING'});mocks.create.mockResolvedValue({id:'receipt'});mocks.fixed.mockResolvedValue({id:'fixed'});mocks.fixedUpdate.mockResolvedValue({count:1});
  mocks.transaction.mockImplementation(async(fn:(tx:unknown)=>unknown)=>fn({financePlan:{upsert:mocks.plan},financeTransaction:{create:mocks.create},fixedExpense:{create:mocks.fixed,updateMany:mocks.fixedUpdate,findMany:vi.fn().mockResolvedValue([])},subscription:{findMany:vi.fn().mockResolvedValue([])},activityEvent:{create:mocks.audit}}));
});
afterEach(()=>vi.useRealTimers());
describe('expected versus received income',()=>{
  it('stores the plan without touching ledger entries or balances',async()=>{
    expect(await saveMonthlyIncome(form({amount:'830,00',accountId:'cash',payDay:'20'}))).toHaveProperty('success');
    expect(mocks.plan.mock.calls[0][0]).toMatchObject({where:{workspaceId:'synthetic'},update:{incomeCents:83000,payDay:20,receivingAccountId:'cash'}});
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('supports an unlinked plan and zeroing the reference',async()=>{
    await saveMonthlyIncome(form({amount:'0'}));expect(mocks.plan.mock.calls[0][0].update).toMatchObject({incomeCents:0,receivingAccountId:null});expect(mocks.account).not.toHaveBeenCalled();
  });
  it.each(['CREDIT_CARD','INVESTMENT','SAVINGS'])('rejects %s as a receiving account',async type=>{
    mocks.account.mockResolvedValue({id:'other',type});expect(await saveMonthlyIncome(form({amount:'10',accountId:'other'}))).toHaveProperty('error');expect(mocks.plan).not.toHaveBeenCalled();
  });
  it('posts income only through explicit receipt confirmation, with a duplicate fingerprint',async()=>{
    const fields=form({amount:'830,00',accountId:'cash',date:'2032-01-10'});
    expect(await receiveMonthlyIncome(fields)).toHaveProperty('success');
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({workspaceId:'synthetic',accountId:'cash',type:'INCOME',source:'MONTHLY_INCOME_RECEIVED',amountCents:83000,fingerprint:expect.any(String)});
    await receiveMonthlyIncome(fields);expect(mocks.create.mock.calls[0][0].data.fingerprint).toBe(mocks.create.mock.calls[1][0].data.fingerprint);
    expect(mocks.plan).not.toHaveBeenCalled();
  });
  it('refuses a future receipt and credit receiving accounts before posting',async()=>{
    expect(await receiveMonthlyIncome(form({amount:'10',accountId:'cash',date:'2032-02-01'}))).toHaveProperty('error');
    mocks.account.mockResolvedValue({id:'card',type:'CREDIT_CARD'});
    expect(await receiveMonthlyIncome(form({amount:'10',accountId:'card',date:'2032-01-10'}))).toHaveProperty('error');expect(mocks.create).not.toHaveBeenCalled();
  });
});
describe('fixed expense planning',()=>{
  it('saves a monthly prediction without generating any actual spending',async()=>{
    await saveFixedExpense(form({name:'Transporte sintético',amount:'90',dueDay:'12'}));expect(mocks.fixed.mock.calls[0][0].data).toMatchObject({workspaceId:'synthetic',amountCents:9000,dueDay:12});expect(mocks.create).not.toHaveBeenCalled();
  });
  it('limits updates and removals to the session workspace',async()=>{
    await saveFixedExpense(form({id:'fixed',workspaceId:'attacker',name:'Synthetic',amount:'10'}));
    await archiveFixedExpense(form({id:'fixed',workspaceId:'attacker'}));
    expect(mocks.fixedUpdate.mock.calls.every(([args])=>args.where.workspaceId==='synthetic')).toBe(true);
  });
  it('keeps an optional end date and the card the expense is charged to, and clears them when left blank',async()=>{
    mocks.account.mockResolvedValue({id:'card',type:'CREDIT_CARD'});
    expect(await saveFixedExpense(form({name:'Resort sintético',amount:'550',dueDay:'2',endsOn:'2032-12-02',cardAccountId:'card'}))).toHaveProperty('success');
    expect(mocks.fixed.mock.calls[0][0].data).toMatchObject({endsOn:new Date('2032-12-02T00:00:00.000Z'),cardAccountId:'card'});
    expect(mocks.account.mock.calls[0][0].where).toMatchObject({id:'card',workspaceId:'synthetic'});
    await saveFixedExpense(form({id:'fixed',name:'Resort sintético',amount:'550',endsOn:'',cardAccountId:''}));
    expect(mocks.fixedUpdate.mock.calls[0][0].data).toMatchObject({endsOn:null,cardAccountId:null});
    await saveFixedExpense(form({name:'Sem fim',amount:'10'}));
    expect(mocks.fixed.mock.calls[1][0].data).toMatchObject({endsOn:null,cardAccountId:null});
  });
  it('only links a credit card of this workspace, and refuses a bad end date before writing anything',async()=>{
    mocks.account.mockResolvedValue({id:'bank',type:'CHECKING'});
    expect(await saveFixedExpense(form({name:'Synthetic',amount:'10',cardAccountId:'bank'}))).toHaveProperty('error');
    mocks.account.mockResolvedValue(null);
    expect(await saveFixedExpense(form({name:'Synthetic',amount:'10',cardAccountId:'someone-elses'}))).toHaveProperty('error');
    mocks.account.mockResolvedValue({id:'card',type:'CREDIT_CARD'});
    for(const endsOn of ['32/13/2032','abc','1999-12-31','2101-01-01'])expect(await saveFixedExpense(form({name:'Synthetic',amount:'10',endsOn,cardAccountId:'card'})),endsOn).toHaveProperty('error');
    expect(mocks.fixed).not.toHaveBeenCalled();expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('rejects invalid payment days and missing expenses',async()=>{
    expect(await saveFixedExpense(form({name:'Synthetic',amount:'10',dueDay:'32'}))).toHaveProperty('error');expect(mocks.fixed).not.toHaveBeenCalled();
    mocks.fixedUpdate.mockResolvedValue({count:0});expect(await archiveFixedExpense(form({id:'foreign'}))).toHaveProperty('error');
  });
});
describe('complete report privacy',()=>{
  it.each(['MEMBER','VIEWER','ADMIN'])('refuses private exports for %s before any financial read',async role=>{
    mocks.permission.mockResolvedValue({workspaceId:'synthetic',role});expect(await exportFinancialReport()).toHaveProperty('error');expect(mocks.account).not.toHaveBeenCalled();expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
