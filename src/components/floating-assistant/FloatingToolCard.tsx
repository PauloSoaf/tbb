"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { FloatingToolId } from "./types";

export type FloatingTool = {
  id: FloatingToolId | string;
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  floating?: FloatingToolId;
  comingSoon?: boolean;
};

export function FloatingToolCard({
  tool,
  onOpenFloating,
}: {
  tool: FloatingTool;
  onOpenFloating: (toolId: FloatingToolId) => void;
}) {
  const Icon = tool.icon;

  return (
    <div className="rounded-lg border border-border-neutral bg-card-bg p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text-primary">{tool.title}</h3>
            {tool.comingSoon && <span className="rounded-full bg-surface-warm px-2 py-0.5 text-[10px] text-text-secondary">em breve</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{tool.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tool.href && !tool.comingSoon && (
              <Link
                href={tool.href}
                className="rounded-md border border-border-neutral px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-brand-blue/40 hover:text-brand-blue"
              >
                Abrir tela completa
              </Link>
            )}
            {tool.floating && (
              <button
                type="button"
                onClick={() => onOpenFloating(tool.floating!)}
                className="rounded-md bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-blue-hover"
              >
                Abrir janela
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
