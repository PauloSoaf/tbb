"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, PencilLine, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { saveMonthlyIncome } from "./actions";
import { useFinanceCopy } from "./finance-copy";
import { moneyInput } from "./money";

type Account = { id: string; name: string };

export function CompactMonthlyIncome({ accounts, today, amountCents, accountId, accountName }: { accounts: Account[]; today: string; amountCents: number; accountId: string; accountName: string | null }) {
  const t = useFinanceCopy();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(data: FormData) {
    startTransition(async () => {
      const result = await saveMonthlyIncome(data);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(result.success);
      formRef.current?.closest("dialog")?.dispatchEvent(new CustomEvent("tbb:form-success", { bubbles: true }));
      router.refresh();
    });
  }

  const configured = amountCents > 0;
  return <section id="renda" className="finance-income-compact" data-configured={configured || undefined}>
    <div className="finance-income-leading">
      <span className="finance-income-icon">{configured ? <CheckCircle2 size={18}/> : <WalletCards size={18}/>}</span>
      <div><span>{t("monthlyIncome")}</span><strong>{configured ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountCents / 100) : "—"}</strong></div>
    </div>
    <div className="finance-income-context">
      <span>{configured ? t("incomeConfigured") : t("incomeMissing")}</span>
      <small>{t("receivingIn")}: <b>{accountName || t("unlinked")}</b></small>
    </div>
    <Modal title={configured ? t("edit") + " · " + t("monthlyIncome") : t("configureIncome")} trigger={<><PencilLine size={15}/>{configured ? t("edit") : t("configure")}</>}>
      <form ref={formRef} className="finance-income-modal-form" action={submit} aria-busy={pending}>
        <input type="hidden" name="date" value={today}/>
        <label><span>{t("incomeValue")}</span><span className="quick-money-input"><i>R$</i><input name="amount" inputMode="decimal" defaultValue={configured ? moneyInput(amountCents) : ""} placeholder="5.500,00" required autoFocus/></span></label>
        <label><span>{t("receivingAccount")}</span><select name="accountId" defaultValue={accountId}><option value="">{t("noAccount")}</option>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
        <button className="button" disabled={pending} type="submit">{pending ? <LoaderCircle className="spin" size={16}/> : <CheckCircle2 size={16}/>} {pending ? t("saving") : t("saveIncome")}</button>
      </form>
    </Modal>
  </section>;
}
