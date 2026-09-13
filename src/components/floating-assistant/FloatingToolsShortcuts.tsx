"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ToolRegistryItem } from "./tool-registry";

export function FloatingToolsShortcuts({
  shortcuts,
  onNavigate,
}: {
  shortcuts: ToolRegistryItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (shortcuts.length === 0) return null;

  return (
    <section className="rounded-xl border border-border-neutral bg-card-bg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-bold uppercase tracking-wide text-text-secondary">Atalhos</span>
          <span className="block text-xs text-text-secondary">Acesse modulos completos quando precisar sair da tela atual.</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border-neutral p-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <div key={shortcut.id} className="flex items-center gap-3 rounded-lg border border-border-neutral bg-warm-surface/60 p-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-bg text-brand-blue">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{shortcut.title}</p>
                  <p className="line-clamp-1 text-xs text-text-secondary">{shortcut.description}</p>
                </div>
                {shortcut.href && (
                  <Link
                    href={shortcut.href}
                    onClick={onNavigate}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-neutral bg-card-bg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir pagina
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
