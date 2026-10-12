import { cookies } from "next/headers";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinanceSpendingCalendar } from "@/features/finance/FinanceSpendingCalendar";
import { calendarSelection } from "@/features/finance/calendar-core";
import { financeCalendarMonth, financeCalendarOptions, financeCalendarCanWrite } from "@/features/finance/calendar-query";
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
  const { month, day } = calendarSelection(params.month, params.day, today);
  const [calendar, options, rows, canWrite] = await Promise.all([
    financeCalendarMonth(context.workspaceId, month, context.role === "OWNER"),
    financeCalendarOptions(context.workspaceId),
    cardStatementRows(context),
    financeCalendarCanWrite(),
  ]);
  return <div className="stack">
    <PageHeader eyebrow={copy("eyebrow")} title={copy("pageTitle")} description={copy("pageHint")}/>
    <FinanceSpendingCalendar key={context.workspaceId} initialMonth={calendar} today={today} accounts={options.accounts} categories={options.categories} initialDay={day} canWrite={canWrite} canManageCards={context.role === "OWNER"}
      statements={rows.map(({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents, rolledIntoStatementId }) => ({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents: detailedCents ?? 0, rolledIntoStatementId }))}/>
  </div>;
}
