import { ActionForm } from "@/components/ui/ActionForm";
import { saveBudget, saveCategory, saveDebt, saveSavingsGoal, saveSubscription, saveTransactionRule } from "./actions";
import { EmptyExpenseCategories } from "./EmptyExpenseCategories";

type Option = { id: string; name: string };
const Save = ({ label = "Salvar" }: { label?: string }) => <button className="button" type="submit">{label}</button>;
const Money = ({ name, label, value }: { name: string; label: string; value?: number | null }) => <label>{label}<input name={name} inputMode="decimal" defaultValue={value == null ? "" : (value / 100).toFixed(2).replace(".", ",")} required /></label>;

export { AccountForm } from "./AccountForm";

export function CategoryForm({ categories }: { categories: (Option & { type: string })[] }) {
  return <ActionForm action={saveCategory} className="form-grid"><label>Nome<input name="name" required/></label><label>Tipo<select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></label><label>Categoria principal<select name="parentId"><option value="">Nenhuma</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Cor<input name="color" type="color" defaultValue="#605de9"/></label><label>Ícone<input name="icon" defaultValue="tag"/></label><Save label="Criar categoria"/></ActionForm>;
}

export function BudgetForm({ categories, today }: { categories: Option[]; today: string }) {
  if (!categories.length) return <EmptyExpenseCategories/>;
  return <ActionForm action={saveBudget} className="form-grid"><label>Categoria<select name="categoryId" required><option value="">Selecione</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Período<select name="period"><option value="MONTHLY">Mensal</option><option value="WEEKLY">Semanal</option></select></label><Money name="limit" label="Limite"/><label>Início<input name="startDate" type="date" defaultValue={today.slice(0,7)+"-01"} required/></label><label>Fim<input name="endDate" type="date" required/></label><Save/></ActionForm>;
}

export function SubscriptionForm({ accounts, categories, today }: { accounts: Option[]; categories: Option[]; today: string }) {
  return <ActionForm action={saveSubscription} className="form-grid"><label>Nome<input name="name" required/></label><label>Estabelecimento<input name="merchant"/></label><Money name="amount" label="Valor"/><label>Ciclo<select name="billingCycle"><option value="MONTHLY">Mensal</option><option value="WEEKLY">Semanal</option><option value="QUARTERLY">Trimestral</option><option value="YEARLY">Anual</option><option value="CUSTOM">Personalizado</option></select></label><label>Próxima cobrança<input name="nextChargeDate" type="date" defaultValue={today} required/></label><label>Início<input name="startedAt" type="date" defaultValue={today} required/></label><label>Conta<select name="accountId"><option value="">Nenhuma</option>{accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Categoria<select name="categoryId"><option value="">Nenhuma</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label><input name="independent" type="checkbox"/>Se houver um compromisso semelhante, confirmo que s\u00e3o gastos independentes.</label><Save/></ActionForm>;
}

export function DebtForm({ today }: { today: string }) {
  return <ActionForm action={saveDebt} className="form-grid"><label>Nome<input name="name" required/></label><Money name="originalAmount" label="Valor original"/><Money name="remainingBalance" label="Saldo restante"/><Money name="minimumPayment" label="Pagamento mínimo"/><label>Juros (%)<input name="interestRate" inputMode="decimal" defaultValue="0" required/></label><label>Período da taxa<select name="ratePeriod"><option value="MONTHLY">Mensal</option><option value="YEARLY">Anual</option></select></label><label>Parcelas<input name="installments" type="number" min={1} max={600}/></label><label>Dia de vencimento<input name="dueDay" type="number" min={1} max={31}/></label><label>Início<input name="startDate" type="date" defaultValue={today} required/></label><label>Meta de quitação<input name="targetPayoffDate" type="date"/></label><Save/></ActionForm>;
}

export function SavingsForm({ accounts }: { accounts: Option[] }) {
  return <ActionForm action={saveSavingsGoal} className="form-grid"><label>Nome<input name="name" required/></label><Money name="targetAmount" label="Meta"/><Money name="currentAmount" label="Valor atual"/><label>Conta vinculada<select name="linkedAccountId"><option value="">Nenhuma</option>{accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Data alvo<input name="targetDate" type="date"/></label><Save/></ActionForm>;
}

export function RuleForm({ accounts, categories }: { accounts: Option[]; categories: Option[] }) {
  return <ActionForm action={saveTransactionRule} className="form-grid"><label>Nome<input name="name" required/></label><label>Campo<select name="field"><option value="description">Descrição</option><option value="merchant">Estabelecimento</option></select></label><label>Comparação<select name="operator"><option value="contains">Contém</option><option value="startsWith">Começa com</option><option value="equals">É igual</option></select></label><label>Texto<input name="value" required/></label><label>Categoria aplicada<select name="categoryId"><option value="">Não alterar</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Conta restrita<select name="accountId"><option value="">Todas</option>{accounts.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Definir estabelecimento<input name="setMerchant"/></label><label>Adicionar tag<input name="addTag"/></label><label>Prioridade<input name="priority" type="number" min={0} max={10000} defaultValue={100}/></label><Save label="Criar regra"/></ActionForm>;
}
