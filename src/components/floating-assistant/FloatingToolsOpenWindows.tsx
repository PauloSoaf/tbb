"use client";

import { Eye, Minus, RotateCcw, X } from "lucide-react";
import type { FloatingToolWindowState } from "./floating-tools-store";

export function FloatingToolsOpenWindows({
  windows,
  onFocus,
  onMinimize,
  onRestore,
  onClose,
}: {
  windows: FloatingToolWindowState[];
  onFocus: (windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onRestore: (windowId: string) => void;
  onClose: (windowId: string) => void;
}) {
  if (windows.length === 0) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Janelas abertas</h3>
        <p className="text-xs text-text-secondary">Foque, minimize ou feche sem sair da tela.</p>
      </div>
      <div className="space-y-2">
        {windows.map((window) => (
          <div key={window.id} className="rounded-xl border border-border-neutral bg-card-bg p-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{window.title}</p>
                <p className="text-[11px] text-text-secondary">{window.minimized ? "Minimizada" : "Aberta"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" aria-label={`Focar ${window.title}`} onClick={() => onFocus(window.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-surface hover:text-brand-blue">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {window.minimized ? (
                  <button type="button" aria-label={`Restaurar ${window.title}`} onClick={() => onRestore(window.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-surface hover:text-brand-blue">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button type="button" aria-label={`Minimizar ${window.title}`} onClick={() => onMinimize(window.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-surface hover:text-brand-blue">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" aria-label={`Fechar ${window.title}`} onClick={() => onClose(window.id)} className="rounded-lg p-1.5 text-text-secondary hover:bg-rose-50 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
