import {describe,expect,it} from 'vitest';
import {extractText} from 'unpdf';
import {buildFinancialReport} from '../financial-report';
import {financialReportPdf} from '../report-pdf';
import type {FinanceOverviewData} from '../overview-query';
const data={personalAssets:[],today:'2032-01-10',metrics:{financialNetWorthCents:12000,personalAssetsCents:0,cashBalanceCents:18000,reserveBalanceCents:3000,netWorthCents:12000,incomeCents:0,expensesCents:1000,balanceCents:-1000,fixedCents:4000,variableCents:1000,availableCents:15000,openInvoicesCents:6000,debtCents:0},monthlyIncome:{amountCents:20000,payDay:20,accountName:'Conta sintética'},banks:[{name:'Banco sintético',hasCash:true,cashCents:18000,reserveCents:3000,cardCount:0}],accounts:[],creditCards:[],plannedFixed:[],budgets:[],funding:null} as unknown as FinanceOverviewData;
const rows={statements:[],transactions:[],debts:[],subscriptions:[],goals:[],investments:[]};
describe('financial report exports',()=>{
  it('exports personal asset values and debt references separately without another liability deduction',()=>{
    const snapshot={...data,metrics:{...data.metrics,financialNetWorthCents:12000,personalAssetsCents:8500,netWorthCents:20500},personalAssets:[{id:'asset',name:'Bem sintético',kind:'VEHICLE' as const,valueCents:8500,valuationDate:'2032-01-09',purchaseValueCents:10000,purchaseDate:'2031-01-01',notes:'Avaliação sintética',archivedAt:null,version:1,debtId:'debt',debt:{name:'Financiamento sintético',remainingBalanceCents:3000,status:'ACTIVE'}}]};
    const report=buildFinancialReport(snapshot,rows);
    expect(report.markdown).toContain('Bens pessoais e composição do patrimônio');
    expect(report.markdown).toContain('Bem sintético | Veículo');expect(report.markdown).toContain('205,00');
    expect(report.markdown).toContain('Financiamento sintético');expect(report.markdown).toContain('já foram descontados');
  });
  it('keeps received income, planned income, cash, reserves and forecast criteria separate',()=>{
    const report=buildFinancialReport(data,rows);
    expect(report.markdown).toContain('Receitas efetivamente registradas no mês | R$');expect(report.markdown).toContain('Renda mensal prevista (não recebimento)');expect(report.markdown).toContain('Cofrinhos e poupança');expect(report.markdown).toContain('não antecipa salário');
    for(const section of ['Todos os cartões','Todas as faturas','Histórico completo','Gastos fixos','Dívidas efetivas','Investimentos'])expect(report.markdown).toContain(section);
  });
  it('exports future and legacy planning rows explicitly and escapes table delimiters',()=>{
    const transaction={date:'2032-02-01',description:'Sintético | teste\nlinha',type:'INCOME',amountCents:20000,account:'Cash',destination:null,category:null,source:'QUICK_INCOME',statementDetailMode:null,installmentNumber:null,installmentTotal:null,recurring:true,merchant:null,notes:null};
    const report=buildFinancialReport(data,{...rows,transactions:[transaction,{...transaction,source:'MANUAL'}]});
    expect(report.markdown).toContain('Previsão de renda antiga, sem confirmação');expect(report.markdown).toContain('Futuro, fora do saldo atual');expect(report.markdown).toContain('Sintético \\| teste linha');
  });
  it('produces a readable paginated PDF containing the final record of a long history',async()=>{
    const transactions=Array.from({length:120},(_,i)=>({date:'2032-01-05',description:`Registro sintético extenso ${i} para conferir a paginação e a integridade do relatório financeiro exportado`,type:'EXPENSE',amountCents:100,account:'Conta sintética',destination:null,category:null,source:'MANUAL',statementDetailMode:null,installmentNumber:null,installmentTotal:null,recurring:false,merchant:null,notes:'Informação de demonstração'}));
    const buffer=await financialReportPdf(buildFinancialReport(data,{...rows,transactions}));
    expect(Buffer.from(buffer).subarray(0,5).toString()).toBe('%PDF-');
    const parsed=await extractText(new Uint8Array(buffer),{mergePages:true});
    expect(parsed.totalPages).toBeGreaterThan(2);expect(parsed.text).toContain('119');expect(parsed.text).toContain('Relatório');expect(parsed.text).toContain('Critérios');
  });
});
