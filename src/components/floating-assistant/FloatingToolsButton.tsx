"use client";

import { Wrench } from "lucide-react";

export function FloatingToolsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir ferramentas flutuantes"
      className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/20 bg-card-bg text-foreground shadow-lg transition-all duration-150 hover:scale-[1.05] hover:border-foreground/40 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:ring-offset-2"
    >
      <Wrench className="h-5 w-5" />
      <span className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 lg:block">
        Ferramentas
      </span>
    </button>
  );
}
