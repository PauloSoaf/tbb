"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, LoaderCircle, ReceiptText, Save, Target, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { saveMonthlyIncome } from "./actions";
import { money } from "./money";

type Account={id:string;name:string};

export function QuickMonthlyIncome({accounts,today,currentIncome}:{accounts:Account[];today:string;currentIncome:number}){
  const router=useRouter();
  const formRef=useRef<HTMLFormElement>(null);
  const [pending,startTransition]=useTransition();

  function submit(data:FormData){
    startTransition(async()=>{
      const result=await saveMonthlyIncome(data);
      if("error" in result){toast.error(result.error);return}
      toast.success(result.success);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return <section className="quick-finance-setup" aria-labelledby="quick-income-title" data-pending={pending||undefined}>
    <span className="quick-finance-progress" aria-hidden="true"/>
    <header className="quick-finance-header">
      <div className="quick-finance-copy"><span className="quick-finance-icon"><WalletCards size={21}/></span><div><span className="eyebrow">PLANEJAMENTO RÁPIDO</span><h2 id="quick-income-title">Renda mensal</h2><p>Defina a referência usada nas projeções e nos alertas do mês.</p></div></div>
      {currentIncome>0&&<span className="quick-income-status"><CheckCircle2 size={15}/><span><small>Renda configurada</small><strong>{money(currentIncome)}</strong></span></span>}
    </header>
    <div className="quick-finance-body">
      <form ref={formRef} className="quick-income-form" action={submit} aria-busy={pending}>
        <input type="hidden" name="date" value={today}/>
        <fieldset className="quick-income-fields" disabled={pending}>
          <label><span>Valor mensal</span><span className="quick-money-input"><i>R$</i><input name="amount" inputMode="decimal" placeholder="5.500,00" required aria-label="Valor da renda mensal" autoComplete="off"/></span></label>
          <label><span>Conta de recebimento</span><select name="accountId" defaultValue=""><option value="">Sem conta por enquanto</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <button className="button quick-income-submit" type="submit"><span className="quick-submit-icon">{pending?<LoaderCircle size={16}/>:<Save size={16}/>}</span><span>{pending?"Salvando renda…":"Salvar renda"}</span></button>
        </fieldset>
        <p className="quick-income-hint">Você pode alterar este valor depois. O lançamento do mês será atualizado sem duplicação.</p>
      </form>
      <aside className="quick-finance-actions" aria-label="Outras configurações rápidas">
        <span className="quick-actions-label">Outras ações rápidas</span>
        <div className="quick-finance-links">
          <Link href="/finance/budgets"><span className="quick-link-icon"><Target size={16}/></span><span><strong>Definir meta de gastos</strong><small>Crie limites por categoria</small></span><ArrowRight size={15}/></Link>
          <Link href="#transacoes"><span className="quick-link-icon"><ReceiptText size={16}/></span><span><strong>Adicionar despesa</strong><small>Registre um novo lançamento</small></span><ArrowRight size={15}/></Link>
          <Link href="/finance/accounts"><span className="quick-link-icon"><CreditCard size={16}/></span><span><strong>Configurar cartão</strong><small>Informe limite e vencimento</small></span><ArrowRight size={15}/></Link>
        </div>
      </aside>
    </div>
  </section>;
}
