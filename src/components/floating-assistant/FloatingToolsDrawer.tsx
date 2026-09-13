"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Wrench } from "lucide-react";
import type { FloatingToolId } from "./types";
import type { FloatingToolWindowState } from "./floating-tools-store";
import { FloatingToolsSearch } from "./FloatingToolsSearch";
import { getToolRegistry } from "./tool-registry";
import { FloatingToolsList } from "./FloatingToolsList";
import { FloatingToolsOpenWindows } from "./FloatingToolsOpenWindows";
import { FloatingToolsShortcuts } from "./FloatingToolsShortcuts";

export function FloatingToolsDrawer({
  tenant,
  open,
  windows,
  onClose,
  onOpenFloatingTool,
  onFocusWindow,
  onMinimizeWindow,
  onRestoreWindow,
  onCloseWindow,
}: {
  tenant: string;
  open: boolean;
  windows: FloatingToolWindowState[];
  onClose: () => void;
  onOpenFloatingTool: (toolId: FloatingToolId) => void;
  onFocusWindow: (windowId: string) => void;
  onMinimizeWindow: (windowId: string) => void;
  onRestoreWindow: (windowId: string) => void;
  onCloseWindow: (windowId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const tools = useMemo(() => getToolRegistry(tenant), [tenant]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = (tool: { title: string; description: string }) => (
      !normalized || `${tool.title} ${tool.description}`.toLowerCase().includes(normalized)
    );
    return {
      windowTools: tools.filter((tool) => tool.floating && (tool.mode === "window" || tool.mode === "both") && matches(tool)),
      shortcuts: tools.filter((tool) => tool.href && (tool.mode === "shortcut" || tool.mode === "both") && matches(tool)),
    };
  }, [query, tools]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9100] print:hidden">
      <button aria-label="Fechar ferramentas" className="pointer-events-auto absolute inset-0 bg-slate-950/25 sm:hidden" onClick={onClose} />
      <aside className="pointer-events-auto absolute bottom-0 right-0 top-0 flex w-full flex-col border-l border-border-neutral bg-card-bg shadow-2xl sm:w-[440px] motion-safe:animate-in motion-safe:slide-in-from-right">
        <header className="border-b border-border-neutral p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary">Ferramentas rapidas</h2>
                <p className="text-xs text-text-secondary">Use utilitarios sem sair da tela atual.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-text-secondary hover:bg-surface-warm hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <FloatingToolsSearch value={query} onChange={setQuery} />
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-warm-surface/60 p-4">
          <FloatingToolsList tools={filtered.windowTools} onOpenWindow={onOpenFloatingTool} />

          <FloatingToolsOpenWindows
            windows={windows}
            onFocus={onFocusWindow}
            onMinimize={onMinimizeWindow}
            onRestore={onRestoreWindow}
            onClose={onCloseWindow}
          />

          <FloatingToolsShortcuts shortcuts={filtered.shortcuts} onNavigate={onClose} />

          {filtered.windowTools.length === 0 && filtered.shortcuts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-neutral bg-card-bg p-6 text-center text-sm text-text-secondary">
              Nenhuma ferramenta encontrada.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
