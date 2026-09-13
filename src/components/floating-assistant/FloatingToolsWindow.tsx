"use client";

import Link from "next/link";
import { Maximize2, Minus, RotateCcw, X } from "lucide-react";
import type { FloatingToolId } from "./types";
import type { FloatingToolWindowState } from "./floating-tools-store";
import { DraggableFloatingWindow } from "./DraggableFloatingWindow";
import { MiniBMICalculatorTool } from "./MiniBMICalculatorTool";
import { MiniMacroCalculatorTool } from "./MiniMacroCalculatorTool";
import { MiniCalculatorTool } from "./MiniCalculatorTool";
import { MiniTacoSearchTool } from "./MiniTacoSearchTool";
import { MiniTMBCalculatorTool } from "./MiniTMBCalculatorTool";
import { getWindowToolById } from "./tool-registry";
import { HouseholdMeasureConverter } from "@/components/household-measures/HouseholdMeasureConverter";
import { useI18n } from "@/lib/i18n/I18nContext";

const TOOL_TITLES: Record<FloatingToolId, string> = {
  taco: "TACO rapida",
  "portion-converter": "Conversor de porcoes",
  bmi: "Calculadora de IMC",
  macros: "Distribuicao de Macros",
  water: "Agua diaria",
  tmb: "TMB e GET",
};

export function FloatingToolsWindow({
  tenant,
  window,
  mobileActive,
  onClose,
  onMinimize,
  onRestore,
  onFocus,
  onMove,
  onOpenTools,
}: {
  tenant: string;
  window: FloatingToolWindowState;
  mobileActive: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onFocus: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onOpenTools: () => void;
}) {
  const { t } = useI18n();
  const tool = getWindowToolById(tenant, window.toolId);
  const Icon = tool?.icon;
  const title = tool?.titleKey ? t(tool.titleKey) : tool?.title ?? TOOL_TITLES[window.toolId];
  const fullHref = tool?.href ?? (window.toolId === "taco" ? `/dashboard/${tenant}/ferramentas/taco` : `/dashboard/${tenant}/ferramentas/calculadoras`);

  const actions = (
    <>
      {window.minimized ? (
        <button type="button" aria-label="Restaurar" onClick={onRestore} className="rounded-md p-1.5 text-text-secondary hover:bg-surface-warm hover:text-brand-blue">
          <RotateCcw className="h-4 w-4" />
        </button>
      ) : (
        <button type="button" aria-label="Minimizar" onClick={onMinimize} className="rounded-md p-1.5 text-text-secondary hover:bg-surface-warm hover:text-brand-blue">
          <Minus className="h-4 w-4" />
        </button>
      )}
      <Link aria-label="Abrir tela completa" href={fullHref} className="rounded-md p-1.5 text-text-secondary hover:bg-surface-warm hover:text-brand-blue">
        <Maximize2 className="h-4 w-4" />
      </Link>
      <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-md p-1.5 text-text-secondary hover:bg-rose-50 hover:text-rose-600">
        <X className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <>
      <DraggableFloatingWindow
        title={title}
        icon={Icon ? <Icon className="h-4 w-4" /> : null}
        actions={actions}
        position={window.position}
        size={window.size}
        zIndex={window.zIndex}
        minimized={window.minimized}
        onMove={onMove}
        onFocus={onFocus}
      >
        <ToolContent toolId={window.toolId} />
      </DraggableFloatingWindow>

      {mobileActive && (
        <div className="fixed inset-x-0 bottom-0 z-[9050] max-h-[82vh] overflow-y-auto rounded-t-2xl border border-border-neutral bg-card-bg p-4 shadow-2xl lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {Icon && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue"><Icon className="h-4 w-4" /></div>}
              <h2 className="truncate font-bold text-text-primary">{title}</h2>
            </div>
            <div className="flex items-center gap-1">{actions}</div>
          </div>
          {!window.minimized && <ToolContent toolId={window.toolId} />}
          <button type="button" onClick={onOpenTools} className="mt-3 w-full rounded-lg border border-border-neutral px-3 py-2 text-sm font-medium text-text-secondary">
            Ver todas as ferramentas
          </button>
        </div>
      )}
    </>
  );
}

function ToolContent({ toolId }: { toolId: FloatingToolId }) {
  if (toolId === "taco") return <MiniTacoSearchTool />;
  if (toolId === "portion-converter") return <HouseholdMeasureConverter mode="compact" />;
  if (toolId === "bmi") return <MiniBMICalculatorTool />;
  if (toolId === "macros") return <MiniMacroCalculatorTool />;
  if (toolId === "water") return <MiniCalculatorTool />;
  if (toolId === "tmb") return <MiniTMBCalculatorTool />;
  return null;
}
