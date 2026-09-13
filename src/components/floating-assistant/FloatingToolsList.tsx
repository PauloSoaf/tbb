"use client";

import Link from "next/link";
import { MoreHorizontal, PanelTopOpen, Star } from "lucide-react";
import type { FloatingToolId } from "./types";
import type { ToolRegistryItem } from "./tool-registry";
import { useI18n } from "@/lib/i18n/I18nContext";

export function FloatingToolsList({
  tools,
  onOpenWindow,
}: {
  tools: ToolRegistryItem[];
  onOpenWindow: (toolId: FloatingToolId) => void;
}) {
  const { t } = useI18n();
  if (tools.length === 0) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Abrir em janela</h3>
        <p className="text-xs text-text-secondary">Mini ferramentas para usar sobre a tela atual.</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const title = tool.titleKey ? t(tool.titleKey) : tool.title;
          const description = tool.descriptionKey ? t(tool.descriptionKey) : tool.description;
          return (
            <article key={tool.id} className="group rounded-xl border border-border-neutral bg-card-bg p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-text-primary">{title}</h4>
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {tool.floating && (
                      <button
                        type="button"
                        onClick={() => onOpenWindow(tool.floating!)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                      >
                        <PanelTopOpen className="h-3.5 w-3.5" />
                        Abrir janela
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {tool.href && (
                        <Link
                          href={tool.href}
                          aria-label={`Abrir pagina completa de ${title}`}
                          className="rounded-lg border border-transparent p-1.5 text-text-secondary opacity-70 transition-all hover:border-border-neutral hover:bg-surface-warm hover:text-brand-blue group-hover:opacity-100"
                          title="Abrir tela completa"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        aria-label={`Fixar ${title} como favorita`}
                        className="rounded-lg border border-transparent p-1.5 text-text-secondary opacity-70 transition-all hover:border-border-neutral hover:bg-surface-warm hover:text-amber-500 group-hover:opacity-100"
                        title="Fixar como favorita"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
