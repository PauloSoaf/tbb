"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { saveAccount } from "./actions";

export type AccountFormValue = { id: string; name: string; type: string; institution: string | null; initialBalanceCents: number; creditLimitCents: number | null; closingDay: number | null; dueDay: number | null };

const types = [["CHECKING", "Conta corrente"], ["SAVINGS", "Poupança"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["INVESTMENT", "Investimento"], ["DIGITAL_WALLET", "Carteira digital"], ["OTHER", "Outro"]];
const moneyValue = (value?: number | null) => (value == null ? "" : (value / 100).toFixed(2).replace(".", ","));

export function AccountForm({ account }: { account?: AccountFormValue }) {
  const [type, setType] = useState(account?.type || "CHECKING");
  const isCard = type === "CREDIT_CARD";
  return <ActionForm action={saveAccount} className="form-grid" resetOnSuccess={!account}>
    {account && <input type="hidden" name="id" value={account.id}/>}
    <label>Nome<input name="name" defaultValue={account?.name} required maxLength={200}/></label>
    <label>Tipo<select name="type" value={type} onChange={(event) => setType(event.target.value)}>{types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>Instituição<input name="institution" defaultValue={account?.institution || ""}/></label>
    <label>{isCard ? "Saldo inicial da fatura" : "Saldo inicial"}<input name="initialBalance" inputMode="decimal" defaultValue={moneyValue(account?.initialBalanceCents)} required/></label>
    {isCard && <>
      <label>Limite de crédito<input name="creditLimit" inputMode="decimal" defaultValue={moneyValue(account?.creditLimitCents)} required/></label>
      <label>Fechamento<input name="closingDay" type="number" min={1} max={31} defaultValue={account?.closingDay || ""} placeholder="Dia"/></label>
      <label>Vencimento<input name="dueDay" type="number" min={1} max={31} defaultValue={account?.dueDay || ""} placeholder="Dia"/></label>
    </>}
    <button className="button" type="submit">Salvar</button>
  </ActionForm>;
}
