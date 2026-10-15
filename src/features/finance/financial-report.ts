import type { StatementRow } from "./card-statements";
import type { FinanceOverviewData } from "./overview-query";
import { money } from "./money";
import { personalAssetCopy } from "./personal-asset-copy";

type LedgerRow={date:string;description:string;type:string;amountCents:number;account:string;destination:string|null;category:string|null;source:string;statementDetailMode:string|null;installmentNumber:number|null;installmentTotal:number|null;recurring:boolean;merchant:string|null;notes:string|null;postedDate?:string|null;purchasedDate?:string|null;occurredAt?:string|null;occurredTimezone?:string|null;eventKind?:string;isConsumption?:boolean;originalCurrency?:string|null;originalAmountCents?:number|null;exchangeRate?:string|null};
type ReportRows={
  statements:StatementRow[];
  transactions:LedgerRow[];
  debts:{name:string;status:string;remainingBalanceCents:number;originalAmountCents:number;minimumPaymentCents:number;dueDay:number|null;interestBasisPoints:number;ratePeriod:string;targetPayoffDate:string|null}[];
  subscriptions:{name:string;status:string;amountCents:number;billingCycle:string;nextChargeDate:string;account:string|null;nextChargeIsEstimate?:boolean;amountIsEstimate?:boolean;originalCurrency?:string|null;originalAmountCents?:number|null}[];
  payments?:{account:string;date:string|null;amountCents:number;statement:string|null}[];
  pending?:{fileName:string;locator:string;reason:string}[];
  investments:{name:string;account:string;currentValueCents:number;bookCostCents:number}[];
  goals:{name:string;status:string;currentAmountCents:number;targetAmountCents:number;targetDate:string|null}[];
};
const cell=(value:unknown)=>String(value??"Não informado").replace(/\r?\n/g," ").replace(/\|/g,"\\|").replace(/[\u0000-\u001f]/g,"");
function table(headers:string[],rows:unknown[][]){return rows.length?[headers.map(cell).join(" | "),headers.map(()=>"---").join(" | "),...rows.map((row)=>row.map(cell).join(" | "))].join("\n"):"Nenhum registro.";}
export function buildFinancialReport(data:FinanceOverviewData,rows:ReportRows){
  const m=data.metrics, funding=data.funding;
  const sections=[
    "# TBB — Relatório completo da vida financeira",
    `Data de referência: ${data.today}. Valores em BRL. Retrato dos registros do seu espaço pessoal na data da exportação.`,
    "## Resumo atual",
    table(["Indicador","Valor"],[['Saldo atual em contas (dinheiro)',money(m.cashBalanceCents)],['Cofrinhos e poupança (separados)',money(m.reserveBalanceCents)],['Patrimônio líquido estimado',money(m.netWorthCents)],['Receitas efetivamente registradas no mês',money(m.incomeCents)],['Despesas registradas no mês',money(m.expensesCents)],['Resultado do mês (receitas menos despesas)',money(m.balanceCents)],['Renda mensal prevista (não recebimento)',money(data.monthlyIncome.amountCents)],['Dia previsto da renda',data.monthlyIncome.payDay||'Não informado'],['Conta prevista para receber',data.monthlyIncome.accountName],['Gastos fixos mensais previstos',money(m.fixedCents)],['Variáveis registrados',money(m.variableCents)],['Sobra da renda prevista (não saldo)',money(m.availableCents)],['Faturas abertas',money(m.openInvoicesCents)],['Dívidas efetivas ativas',money(m.debtCents)]]),
    "## Contas e reservas por banco",
    table(['Banco','Saldo para débito','Cofrinhos / poupança','Cartões'],data.banks.map((bank)=>[bank.name,bank.hasCash?money(bank.cashCents):'Não informado',money(bank.reserveCents),bank.cardCount])),
    "### Todos os produtos ativos",
    table(['Produto','Instituição','Tipo','Saldo do produto'],data.accounts.filter((a)=>!a.unassigned).map((a)=>[a.name,a.institution,a.type,a.type==='CREDIT_CARD'?'Consulte faturas e limite abaixo':money(a.balanceCents)])),
    "## Todos os cartões e limites",
    table(['Cartão','Limite','Aberto','Futuro comprometido','Disponível de crédito','Excesso','Ciclo habitual'],data.creditCards.map((c)=>[c.name,c.breakdown.hasLimit?money(c.limitCents):'Não informado',money(c.breakdown.openCents),money(c.breakdown.futureCents),c.breakdown.availableCents===null?'Não informado':money(c.breakdown.availableCents),money(c.breakdown.excessCents),`Fecha dia ${c.closingDay||'?'}; vence dia ${c.dueDay||'?'}`])),
    "## Todas as faturas, histórico e previsões",
    table(['Cartão','Tipo','Status','Valor efetivo','Competência','Fechamento','Vencimento','Pago em','Conciliação','Detalhado','Total original','Pagamento confirmado','Saldo carregado'],rows.statements.map((s)=>[s.accountName,s.kind,s.status,money(s.amountCents),s.referenceMonth,s.closingDate||s.closingDay&&`Dia ${s.closingDay}`,s.dueDate,s.paidAt,s.reconciliation,money(s.detailedCents||0),money(s.declaredCents??s.amountCents),money(s.paidCents||0),s.rolledIntoStatementId?'Já incluído na fatura seguinte; não somado novamente':'Não'])),
    "## Pagamentos de cartão confirmados",
    "Estes pagamentos conciliam obrigações. Não são receitas nem novas despesas de consumo; não se presume a conta de dinheiro de origem.",
    table(['Cartão','Data','Valor','Fatura'],(rows.payments||[]).map(p=>[p.account,p.date,money(p.amountCents),p.statement])),
    "## Cobertura e possível dívida",
    funding ? `${funding.hasCash?`Dinheiro registrado para pagar: ${money(funding.cashCents)}. Falta para cobrir as faturas abertas: ${money(funding.shortfallCents)}.`:'Saldo de dinheiro não informado; cobertura desconhecida.'} ${funding.overdueCount} fatura(s) vencida(s). ${funding.missingStatementCount} cartão(ões) sem faturas registradas. A possível dívida é calculada, não uma dívida financiada cadastrada.`:'Cobertura não disponível.',
    table(['Mês de vencimento','Faturas conhecidas','Acumulado','Falta acumulada com caixa de hoje'],funding?.timeline.map((p)=>[p.month,money(p.amountCents),money(p.cumulativeCents),funding.hasCash?money(p.shortfallCents):'Desconhecida'])||[]),
    "## Gastos fixos previstos",
    table(['Gasto','Valor mensal','Dia previsto','Termina em','Cobrado no cartão','Observações'],data.plannedFixed.map((f)=>[f.name,money(f.amountCents),f.dueDay,f.endsOn??'Sem data de término',data.creditCards.find((card)=>card.id===f.cardAccountId)?.name??(f.cardAccountId?'Cartão arquivado':'Não'),f.notes])),
    "## Assinaturas e compromissos recorrentes",
    table(['Nome','Status','Valor por ciclo','Ciclo','Próxima cobrança','Conta','Plano original'],rows.subscriptions.map((s)=>[s.name,s.status,`${money(s.amountCents)}${s.amountIsEstimate?' (estimado)':''}`,s.billingCycle,`${s.nextChargeDate}${s.nextChargeIsEstimate?' (estimada)':''}`,s.account,s.originalCurrency&&s.originalAmountCents?money(s.originalAmountCents,s.originalCurrency):'BRL'])),
    "## Dívidas efetivas",
    table(['Nome','Status','Original','Restante','Pagamento mínimo','Dia','Juros','Meta de quitação'],rows.debts.map((d)=>[d.name,d.status,money(d.originalAmountCents),money(d.remainingBalanceCents),money(d.minimumPaymentCents),d.dueDay,`${d.interestBasisPoints/100}% ${d.ratePeriod}`,d.targetPayoffDate])),
    "## Orçamentos ativos",
    table(['Categoria','Limite','Gasto registrado','Uso'],data.budgets.map((b)=>[b.category,money(b.limitCents),money(b.spentCents),`${b.usage}%`])),
    "## Metas de poupança",
    table(['Meta','Status','Valor informado','Objetivo','Data alvo'],rows.goals.map((g)=>[g.name,g.status,money(g.currentAmountCents),money(g.targetAmountCents),g.targetDate])),
    "## Investimentos",
    table(['Ativo','Carteira','Valor atual informado','Custo registrado'],rows.investments.map((i)=>[i.name,i.account,money(i.currentValueCents),money(i.bookCostCents)])),
    "## Bens pessoais e composição do patrimônio",
    table(['Componente','Valor'],[['Patrimônio financeiro líquido (já descontadas as obrigações)',money(m.financialNetWorthCents)],['Bens pelo valor estimado de revenda',money(m.personalAssetsCents)],['Patrimônio líquido total estimado',money(m.netWorthCents)]]),
    table(['Bem','Tipo','Revenda estimada','Avaliado em','Valor de compra','Data da compra','Dívida vinculada','Saldo ativo da dívida (já descontado)','Observações'],data.personalAssets.map((a)=>[a.name,personalAssetCopy('pt').kinds[a.kind],money(a.valueCents),a.valuationDate,a.purchaseValueCents===null?null:money(a.purchaseValueCents),a.purchaseDate,a.debt?.name,a.debt?money(a.debt.status==='ACTIVE'?a.debt.remainingBalanceCents:0):null,a.notes])),
    "Bens pessoais ativos entram no patrimônio pelo valor estimado de revenda, não pelo preço de compra. Bens arquivados ficam fora. A dívida vinculada é informativa: dívidas ativas e compromissos dos cartões já foram descontados no componente financeiro, uma única vez. Bens não entram no saldo de dinheiro, na cobertura de faturas ou no fluxo de caixa. Um bem registrado em Investimentos não deve ser repetido no cadastro de bens.",
    "## Histórico completo de lançamentos e registros futuros",
    table(['Data','Situação','Tipo','Descrição','Estabelecimento','Valor','Conta','Destino','Categoria','Recorrente','Parcela','Vínculo à fatura','Observações'],rows.transactions.map((t)=>[t.date,t.source==='QUICK_INCOME'?'Previsão de renda antiga, sem confirmação':t.date>data.today?'Futuro, fora do saldo atual':'Registrado até hoje',t.type,t.description,t.merchant,money(t.amountCents),t.account,t.destination,t.category,t.recurring?'Sim':'Não',t.installmentTotal?`${t.installmentNumber}/${t.installmentTotal}`:'—',t.statementDetailMode,t.notes])),
    "### Datas, horários e valores originais das importações",
    table(['Evento','Data efetiva','Compra original','Postagem','Hora UTC','Timezone','Natureza','Consumo','Moeda original','Valor original','Cotação'],rows.transactions.filter(t=>t.source==='DOCUMENT_V2').map(t=>[t.description,t.date,t.purchasedDate,t.postedDate,t.occurredAt,t.occurredTimezone,t.eventKind,t.isConsumption===false?'Fora do consumo':'Sim',t.originalCurrency,t.originalAmountCents&&t.originalCurrency?money(t.originalAmountCents,t.originalCurrency):null,t.exchangeRate])),
    "## Ocorrências ainda em revisão",
    table(['Original','Localizador','Motivo'],(rows.pending||[]).map(p=>[p.fileName,p.locator,p.reason])),
    "## Critérios e limites da projeção",
    "Saldo atual usa saldo inicial e movimentações até hoje; não inclui renda prevista, limite de crédito, registros futuros ou metas. Cofrinhos e poupança ficam separados do dinheiro para pagar. Registros antigos QUICK_INCOME foram usados pela interface como referência mensal sem confirmação; são preservados no histórico e excluídos de receitas recebidas e saldos até um recebimento efetivo ser registrado.",
    "Uso da renda compara fixos previstos e variáveis registrados com renda prevista. Não soma totais de faturas nem parcelas futuras. Detalhes de compras já incluídos em faturas não aumentam novamente seus totais. A projeção de faturas consome o caixa atual uma única vez e não antecipa salário ou resgates. FORECAST não compromete limite; PAID não é obrigação aberta. Juros futuros não são inventados. Metas não aumentam novamente o patrimônio. Valores dependem da atualização dos seus registros.",
  ];
  return { markdown:sections.join("\n\n")+"\n", today:data.today, cashCents:funding?.cashCents??m.cashBalanceCents, invoicesCents:m.openInvoicesCents, hasCash:funding?.hasCash??false };
}
export type FinancialReport=ReturnType<typeof buildFinancialReport>;
