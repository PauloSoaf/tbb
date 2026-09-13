"use client";

import { X, Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { AIAssistantChat } from "./AIAssistantChat";
import { AIAssistantContextBar } from "./AIAssistantContextBar";

export function AIAssistantDrawer({ tenant, open, onClose, onOpenTool }: { tenant: string; open: boolean; onClose: () => void; onOpenTool?: (toolId: string) => void }) {
  const pathname = usePathname();
  const patientId = pathname.match(/\/pacientes\/([^/]+)/)?.[1] ?? null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9100] print:hidden">
      <button aria-label="Fechar assistente" className="absolute inset-0 bg-slate-950/20" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-full flex-col bg-card-bg shadow-2xl sm:w-[440px] motion-safe:animate-in motion-safe:slide-in-from-right">
        <header className="border-b border-border-neutral p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary">Assistente NutriOpus</h2>
                <p className="text-xs text-text-secondary">Ajuda com sistema, pacientes e rotina clinica.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg p-2 text-text-secondary hover:bg-surface-warm hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <AIAssistantContextBar tenant={tenant} patientId={patientId} />
          </div>
        </header>
        <AIAssistantChat tenant={tenant} onOpenTool={onOpenTool} />
      </aside>
    </div>
  );
}
