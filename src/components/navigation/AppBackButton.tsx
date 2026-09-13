import { ArrowLeft } from "lucide-react";
import { PendingButtonLink } from "./PendingButtonLink";

interface AppBackButtonProps {
  href: string;
  label: string;
  className?: string;
}

export function AppBackButton({ href, label, className = "" }: AppBackButtonProps) {
  return (
    <PendingButtonLink
      href={href}
      pendingLabel="Carregando..."
      className={`group -ml-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium
        text-text-secondary transition-all duration-150
        hover:bg-brand-blue-soft/50 hover:text-brand-blue active:scale-95
        ${className}`}
    >
      <ArrowLeft
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
        aria-hidden="true"
      />
      <span>{label}</span>
    </PendingButtonLink>
  );
}
