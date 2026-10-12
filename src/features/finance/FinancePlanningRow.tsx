"use client";

import { useState, type ComponentProps } from "react";
import { CompactMonthlyIncome } from "./CompactMonthlyIncome";
import { InvoiceFundingPanel } from "./InvoiceFundingPanel";
import type { InvoiceFunding } from "./bank-accounts";

export function FinancePlanningRow({ income, funding }: {
  income: ComponentProps<typeof CompactMonthlyIncome>;
  funding: InvoiceFunding | null;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  // Dismissal belongs to this visit and this financial snapshot. New balances or bills
  // show the current comparison again, without retaining financial data in browser storage.
  const snapshot = funding ? [income.today, funding.hasCash, funding.cashCents, funding.openCents, funding.shortfallCents, funding.missingStatementCount, funding.overdueCount].join(":") : null;
  const visible = !!funding && dismissed !== snapshot;
  return <div className="finance-planning-area">
    <div className="finance-planning-row" data-funding-visible={visible || undefined}>
      <CompactMonthlyIncome {...income} onShowFunding={funding && !visible ? () => setDismissed(null) : undefined}/>
      {funding && visible && <InvoiceFundingPanel funding={funding} compact onDismiss={() => setDismissed(snapshot)}/>}
    </div>
  </div>;
}
