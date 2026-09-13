import { type LucideIcon } from "lucide-react";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-neutral bg-card-bg p-6 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-text-primary">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      {href && actionLabel && (
        <PendingButtonLink
          href={href}
          pendingLabel="Abrindo..."
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
        >
          {actionLabel}
        </PendingButtonLink>
      )}
    </div>
  );
}
