"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { KeepFormValues } from "@/components/ui/KeepFormValues";
import { money } from "@/features/finance/money";
import { reviewOpenFinanceBill } from "./actions";
import { groupCreditReviews, type CreditReview } from "./review-groups";

const dayLabel = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
const billStatusLabel: Record<string, string> = { OPEN: "Aberta", FUTURE_KNOWN: "Futura conhecida", PAID: "Quitada", FORECAST: "Previsão" };

function BillReview({ review }: { review: CreditReview }) {
  const selected = review.statements.find(statement => statement.id === review.statementId);
  return <details className="of-bill-review">
    <summary className="of-bill-summary"><span>Vence {dayLabel(review.dueDate)}</span><span>{billStatusLabel[review.status ?? ""] ?? "Situação a conferir"}</span><strong>{money(review.totalCents)}</strong><span className="of-review-open">Conferir fatura</span></summary>
    <div className="stack of-review-content">
      <div><p className="muted text-sm">{review.balanceCents !== null ? "Total conciliado" : "Total no banco"}: {money(review.totalCents)}</p>{review.balanceCents !== null && <p className="muted text-sm">Saldo em aberto no banco: {money(review.balanceCents)}. O total acima inclui pagamentos registrados até a data da fonte.</p>}<p className="muted text-xs">{review.closingDate ? `Fecha ${dayLabel(review.closingDate)}` : "Fechamento não informado pelo banco"}</p><p className="muted text-sm">{review.reason}</p><Link className="muted text-sm" href="/finance/statements">Conferir faturas e pagamentos →</Link></div>
      <KeepFormValues><ActionForm action={reviewOpenFinanceBill} className="of-map" resetOnSuccess={false}>
        <input type="hidden" name="snapshotId" value={review.id}/>
        <label>Fatura no TBB<select name="target" defaultValue={selected ? `${selected.id}|${selected.version}` : ""}>
          <option value="">Nova fatura, se o período ainda não existir</option>{review.statements.map(statement => <option key={statement.id} value={`${statement.id}|${statement.version}`}>{statement.dueDate ? dayLabel(statement.dueDate) : statement.referenceMonth || "Sem vencimento"}{statement.closingDate ? ` · fecha ${dayLabel(statement.closingDate)}` : ""} · {money(statement.amountCents)} · {billStatusLabel[statement.status] ?? statement.status}</option>)}
        </select></label>
        <label>Situação confirmada<select name="status" required defaultValue={review.status ?? ""}><option value="" disabled>Conferir situação</option><option value="OPEN">Aberta</option><option value="FUTURE_KNOWN">Futura conhecida</option><option value="PAID">Quitada, com pagamento confirmado</option></select></label>
        <label className="of-check"><input type="checkbox" name="confirm" required/><span>Conferi o total e a fatura de destino</span></label>
        <button className="button-secondary" type="submit">Conciliar fatura</button>
      </ActionForm></KeepFormValues>
    </div>
  </details>;
}

export function CreditBillReviews({ reviews }: { reviews: CreditReview[] }) {
  const groups = groupCreditReviews(reviews);
  if (!groups.length) return null;
  return <section className="panel stack" aria-labelledby="of-reviews-title">
    <div><h2 id="of-reviews-title">Faturas para conciliar</h2><p className="muted text-sm">{groups.length} cartão(ões) · {reviews.length} fatura(s) aguardando conferência. Cada cartão reúne seus vencimentos; expanda para conferir cada fatura.</p></div>
    <p className="muted text-xs">O histórico pode incluir faturas já pagas. A conferência preserva os pagamentos e exige sua confirmação para cada período.</p>
    <div className="of-review-groups">{groups.map(group => <details key={group.accountId} className="of-review-card">
      <summary className="of-review-card-summary"><CreditCard size={19} aria-hidden="true"/><span className="of-review-card-name"><strong>{group.accountName}</strong><small>{group.connectionLabel}{group.maskedNumber ? ` · final ${group.maskedNumber}` : ""}</small></span><span className="badge">{group.reviews.length} fatura(s)</span><span className="of-review-open">Ver vencimentos</span></summary>
      <div className="of-review-periods">{group.reviews.map(review => <BillReview key={review.id} review={review}/>)}</div>
    </details>)}</div>
  </section>;
}
