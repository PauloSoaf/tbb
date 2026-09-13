import Link from "next/link";
import { Info, type LucideIcon } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "purple" | "rose";
  href?: string;
  tooltip?: string;
}

const colorMap = {
  blue: {
    bg: "bg-brand-blue-soft",
    icon: "text-brand-blue",
    border: "border-l-brand-blue",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    border: "border-l-emerald-500",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    border: "border-l-amber-500",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-l-purple-500",
  },
  rose: {
    bg: "bg-rose-50",
    icon: "text-rose-600",
    border: "border-l-rose-500",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  href,
  tooltip,
}: StatsCardProps) {
  const colors = colorMap[color];

  const inner = (
    <div className="flex h-full items-start justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1 min-h-8 sm:min-h-9 text-[10px] sm:text-xs font-semibold text-text-secondary leading-tight">
          <span className="break-words">{title}</span>
          {tooltip && (
            <AppTooltip content={tooltip}>
              <Info
                className="mt-0.5 h-3.5 w-3.5 text-text-tertiary hover:text-text-secondary shrink-0 cursor-help"
                aria-label={tooltip}
              />
            </AppTooltip>
          )}
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-text-primary sm:mt-2 sm:text-3xl">
          {value}
        </p>
      </div>
      <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${colors.bg}`}>
        <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${colors.icon}`} />
      </div>
    </div>
  );

  const className = `block min-h-[104px] bg-card-bg rounded-xl border border-border-neutral border-l-4 ${colors.border} p-3 sm:min-h-[126px] sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200${
    href ? " cursor-pointer" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
