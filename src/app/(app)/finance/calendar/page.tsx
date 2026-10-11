import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinanceSpendingCalendar } from "@/features/finance/FinanceSpendingCalendar";
import { isMonthKey } from "@/features/finance/calendar-core";
import { financeCalendarMonth, financeCalendarOptions } from "@/features/finance/calendar-query";
import { dayKey } from "@/lib/dates";
import { requirePermission } from "@/lib/workspace";
import { cardStatementRows } from "@/features/finance/queries";
import { calendarCopy, type CalendarCopyKey } from "@/features/finance/calendar-copy";
import type { Locale } from "@/lib/i18n/messages";

export default async function SpendingCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  const context = await requirePermission("READ");
  const stored = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale: Locale = stored === "en" || stored === "es" ? stored : "pt";
  const copy = (key: CalendarCopyKey) => calendarCopy[locale][key];
  const params = await searchParams;
  const today = dayKey(new Date(), context.workspace.timezone);
  const month = isMonthKey(params.month ?? "") && params.month !== "9998-12" ? params.month! : today.slice(0, 7);
  const [calendar, options, rows] = await Promise.all([
    financeCalendarMonth(context.workspaceId, month, context.role === "OWNER"),
    financeCalendarOptions(context.workspaceId),
    cardStatementRows(context),
  ]);
  return <div className="stack">
    <PageHeader eyebrow={copy("eyebrow")} title={copy("pageTitle")} description={copy("pageHint")}/>
    <FinanceSpendingCalendar key={`${context.workspaceId}:${month}:${params.day || ""}`} initialMonth={calendar} today={today} accounts={options.accounts} categories={options.categories} initialDay={params.day} canManageCards={context.role === "OWNER"}
      statements={rows.map(({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents }) => ({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents: detailedCents ?? 0 }))}/>
  </div>;
}
