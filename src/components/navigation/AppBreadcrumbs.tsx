import { ChevronRight } from "lucide-react";
import { SmartPrefetchLink } from "./SmartPrefetchLink";
import type { BreadcrumbItem } from "@/lib/navigation/navigation-types";

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
}

export function AppBreadcrumbs({
  items,
  ariaLabel = "Navegação",
  className = "",
}: AppBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={`min-w-0 ${className}`}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm text-text-secondary">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={i} className="flex items-center gap-0.5 min-w-0">
              {i > 0 && (
                <span className="mx-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-warm-beige text-text-secondary">
                  <ChevronRight
                    className="h-4 w-4"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </span>
              )}

              {Icon && (
                <Icon
                  className="w-3.5 h-3.5 mr-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast || !item.href ? (
                <span
                  className="text-text-primary font-medium max-w-[140px] sm:max-w-[220px] truncate"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <SmartPrefetchLink
                  href={item.href}
                  className="hover:text-brand-blue hover:underline transition-colors max-w-[140px] sm:max-w-[220px] truncate"
                >
                  {item.label}
                </SmartPrefetchLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
