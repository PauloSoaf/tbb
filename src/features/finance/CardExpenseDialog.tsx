"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bot, PenLine, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { formatDay } from "@/lib/dates";
import { interpretCardExpense, saveCardExpense } from "./actions";
import { statementLinkError, suggestStatementForPurchase, type PurchaseStatement, type StatementDetailMode } from "./card-statements";
import { money, moneyInput, parseMoney } from "./money";

const OPEN_EVENT = "tbb:card-expense";
type Preset = { accountId?: string; statementId?: string };
export type CardExpenseCard = { id: string; name: string; institution: string | null };
export type CardExpenseStatement = PurchaseStatement & { referenceMonth: string | null; amountCents: number; detailedCents: number };
const STATUS = { PAID: "paga", OPEN: "aberta", FUTURE_KNOWN: "futura", FORECAST: "previsão" } as const;
const day = (value: string) => formatDay(value, "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const examples = ["gastei 89,90 no ifood ontem no nubank", "uber 32 reais no picpay hoje", "amazon 219,90 no itau parcelado em 3x"];

/** Any button on the page can open the single dialog, already pointing at a card or a bill. */
export function CardExpenseButton({ accountId, statementId, className = "button-secondary", label, children }: Preset & { className?: string; label?: string; children: ReactNode }) {
  return <button type="button" className={className} aria-label={label} onClick={() => window.dispatchEvent(new CustomEvent<Preset>(OPEN_EVENT, { detail: { accountId, statementId } }))}>{children}</button>;
}

export function CardExpenseDialog({ cards, categories, statements, today }: { cards: CardExpenseCard[]; categories: { id: string; name: string }[]; statements: CardExpenseStatement[]; today: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"text" | "manual">("text");
  const [text, setText] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [form, setForm] = useState({ accountId: cards[0]?.id ?? "", amount: "", description: "", date: today, merchant: "", categoryId: "", installments: "1" });
  const [choice, setChoice] = useState("auto");
  const [link, setLink] = useState<StatementDetailMode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const open = (event: Event) => {
      const preset = (event as CustomEvent<Preset>).detail ?? {};
      setForm((current) => ({ ...current, accountId: preset.accountId ?? current.accountId ?? cards[0]?.id ?? "" }));
      setChoice(preset.statementId ?? "auto");
      setLink(null);
      setError("");
      setMode(preset.statementId ? "manual" : "text");
      dialog.current?.showModal();
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [cards]);

  const cardStatements = statements.filter((item) => item.accountId === form.accountId).sort((a, b) => (a.dueDate || a.referenceMonth || "").localeCompare(b.dueDate || b.referenceMonth || ""));
  const suggestion = useMemo(() => suggestStatementForPurchase(statements, form.accountId, form.date), [statements, form.accountId, form.date]);
  const statementId = choice === "auto" ? suggestion?.statementId ?? null : choice === "none" ? null : choice;
  const statement = statements.find((item) => item.id === statementId && item.accountId === form.accountId) ?? null;
  let amountCents: number | null = null;
  try { amountCents = form.amount ? parseMoney(form.amount) : null; } catch { amountCents = null; }
  const installments = Math.max(1, Number(form.installments) || 1);
  const firstCents = amountCents ? amountCents - Math.floor(amountCents / installments) * (installments - 1) : null;
  const problem = statement && link && firstCents ? statementLinkError({ status: statement.status, amountCents: statement.amountCents, detailedCents: statement.detailedCents }, link, firstCents) : null;
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const label = (item: CardExpenseStatement) => `${item.dueDate ? `Vence ${day(item.dueDate)}` : `Competência ${item.referenceMonth}`} · ${STATUS[item.status]} · ${money(item.amountCents)}`;

  function interpret() {
    setError("");
    const fd = new FormData();
    fd.set("text", text);
    startTransition(async () => {
      const result = await interpretCardExpense(fd);
      if ("error" in result) { setError(result.error ?? "Não foi possível interpretar o gasto."); return; }
      const draft = result.draft;
      setForm({ accountId: draft.accountId ?? form.accountId, amount: draft.amountCents ? moneyInput(draft.amountCents) : "", description: draft.description, date: draft.date, merchant: draft.merchant ?? "", categoryId: draft.categoryId ?? "", installments: String(draft.installments) });
      setProvider(draft.provider);
      setChoice("auto");
      setLink(null);
      setMode("manual");
    });
  }
  function save() {
    setError("");
    if (statementId && !link) { setError("Diga se a compra já estava incluída no valor da fatura ou se deve ser somada a ele."); return; }
    if (problem) { setError(problem); return; }
    const fd = new FormData();
    for (const [key, value] of Object.entries(form)) fd.set(key, value);
    fd.set("link", statementId && link ? link : "NONE");
    if (statementId) fd.set("statementId", statementId);
    startTransition(async () => {
      const result = await saveCardExpense(fd);
      if ("error" in result) { setError(result.error ?? "Não foi possível salvar o gasto."); return; }
      toast.success(result.success);
      dialog.current?.close();
      setText("");
      setProvider(null);
      setForm((current) => ({ ...current, amount: "", description: "", merchant: "", categoryId: "", installments: "1", date: today }));
      router.refresh();
    });
  }

  return <dialog ref={dialog} className="modal card-expense-dialog" aria-labelledby="card-expense-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="modal-content" aria-busy={pending}>
      <div className="row justify-between"><h2 id="card-expense-title">Adicionar gasto no cartão</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={() => dialog.current?.close()}><X size={18}/></button></div>
      {!cards.length ? <p className="muted">Cadastre um cartão de crédito em Contas para lançar gastos.</p> : <>
        <div className="tabs" role="tablist" aria-label="Modo de entrada">
          <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}><Sparkles size={14}/>Texto com IA</button>
          <button type="button" role="tab" aria-selected={mode === "manual"} onClick={() => setMode("manual")}><PenLine size={14}/>Manual</button>
        </div>
        {mode === "text" && <div className="stack">
          <label>Descreva o gasto<textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder={examples[0]} autoFocus/></label>
          <div className="row card-expense-examples">{examples.map((example) => <button type="button" className="badge" key={example} onClick={() => setText(example)}>{example}</button>)}</div>
          <div className="row justify-between"><small className="muted">Você revisa tudo antes de salvar.</small><button type="button" className="button" onClick={interpret} disabled={pending || text.trim().length < 3}><Sparkles size={15}/>{pending ? "Interpretando…" : "Interpretar"}</button></div>
        </div>}
        {mode === "manual" && <div className="stack">
          {provider && <span className="badge"><Bot size={12}/>{provider === "openai" ? "Interpretado pelo GPT" : "Interpretado localmente"} · confira os campos</span>}
          <div className="form-grid">
            <label>Cartão<select value={form.accountId} onChange={(event) => { update({ accountId: event.target.value }); setChoice("auto"); setLink(null); }}>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
            <label>Valor<input inputMode="decimal" value={form.amount} onChange={(event) => update({ amount: event.target.value })} placeholder="0,00" required/></label>
            <label>Descrição<input value={form.description} onChange={(event) => update({ description: event.target.value })} maxLength={200} required/></label>
            <label>Data da compra<input type="date" value={form.date} onChange={(event) => { update({ date: event.target.value }); if (choice !== "none") setChoice("auto"); }}/></label>
            <label>Estabelecimento<input value={form.merchant} onChange={(event) => update({ merchant: event.target.value })} maxLength={200} placeholder="Opcional"/></label>
            <label>Categoria<select value={form.categoryId} onChange={(event) => update({ categoryId: event.target.value })}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Parcelas<input type="number" min={1} max={24} value={form.installments} onChange={(event) => update({ installments: event.target.value })}/></label>
            <label>Fatura<select value={choice} onChange={(event) => { setChoice(event.target.value); setLink(null); }}>
              <option value="auto">{suggestion ? `Sugerida: vence ${day(suggestion.dueDate)}${suggestion.estimated ? " (fechamento estimado)" : ""}` : "Sugestão indisponível para esta data"}</option>
              {cardStatements.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}
              <option value="none">Sem vincular agora</option>
            </select></label>
          </div>
          {statement && <fieldset className="card-expense-link">
            <legend>Essa compra já estava incluída no valor registrado da fatura?</legend>
            <label><input type="radio" name="card-expense-link" checked={link === "ALREADY_INCLUDED"} onChange={() => setLink("ALREADY_INCLUDED")}/>Sim, já estava incluída: só detalhar, o total não muda</label>
            <label data-disabled={statement.status === "PAID" || undefined}><input type="radio" name="card-expense-link" disabled={statement.status === "PAID"} checked={link === "ADDED_TO_STATEMENT"} onChange={() => setLink("ADDED_TO_STATEMENT")}/>Não estava: somar ao valor da fatura{statement.status === "PAID" ? " (fatura paga não muda)" : ""}</label>
            {link && firstCents && !problem && <small className="muted">{link === "ADDED_TO_STATEMENT" ? `Total da fatura: ${money(statement.amountCents)} → ${money(statement.amountCents + firstCents)}.` : `Total mantido em ${money(statement.amountCents)}; detalhado passa a ${money(statement.detailedCents + firstCents)}.`}{installments > 1 ? " Só a 1ª parcela entra nesta fatura; as demais ficam sem vínculo até as próximas." : ""}</small>}
          </fieldset>}
          {!statement && choice !== "none" && <small className="muted">Nenhuma fatura registrada cobre essa data. O gasto será salvo sem vínculo; você pode vincular depois.</small>}
        </div>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {mode === "manual" && <div className="row justify-between"><button type="button" className="button-secondary" onClick={() => dialog.current?.close()}>Cancelar</button><button type="button" className="button" onClick={save} disabled={pending || !amountCents || !form.description.trim() || !form.accountId}>{pending ? "Salvando…" : "Salvar gasto"}</button></div>}
      </>}
    </div>
  </dialog>;
}
