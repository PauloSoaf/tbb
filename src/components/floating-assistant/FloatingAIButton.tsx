"use client";

import { Sparkles } from "lucide-react";

export function FloatingAIButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir Assistente NutriOpus"
      className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all duration-150 hover:scale-[1.05] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:ring-offset-2"
    >
      <Sparkles className="h-5 w-5" />
      <span className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 lg:block">
        Assistente IA
      </span>
    </button>
  );
}
