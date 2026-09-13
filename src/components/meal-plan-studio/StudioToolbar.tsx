"use client";

import { useState } from "react";
import {
  Save, BookmarkPlus, Copy, UserPlus, Printer, FileText,
  Clipboard, LayoutTemplate, CheckCircle, Clock, Trash2
} from "lucide-react";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface StudioToolbarProps {
  tenantSlug: string;
  planId: string;
  planTitle?: string;
  isTemplate: boolean;
  isSaving: boolean;
  pendingAction?: "save" | "template" | "duplicate" | "apply" | "delete" | null;
  lastSaved: Date | null;
  isDirty: boolean;
  layoutMode: string;
  patients: { id: string; name: string }[];
  onSaveDraft: () => void;
  onSaveAsTemplate: () => void;
  onDuplicate: () => void;
  onUseForPatient: (patientId: string) => void;
  onDeleteTemplate: () => void;
  onLayoutChange: (mode: string) => void;
  onCopyMarkdown: () => void;
  onSmartPaste: () => void;
}

const LAYOUTS = [
  { id: "CLINICAL", label: "Clínico", description: "Mais texto, ideal para impressão" },
  { id: "VISUAL", label: "Visual", description: "Cards com imagens, bonito para PDF" },
  { id: "COMPACT", label: "Compacto", description: "Denso, ideal para planos longos" },
];

export function StudioToolbar({
  tenantSlug,
  planId,

  isTemplate,
  isSaving,
  pendingAction,
  lastSaved,
  isDirty,
  layoutMode,
  patients,
  onSaveDraft,
  onSaveAsTemplate,
  onDuplicate,
  onUseForPatient,
  onDeleteTemplate,
  onLayoutChange,
  onCopyMarkdown,
  onSmartPaste,
}: StudioToolbarProps) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const hasPendingRemoteAction = pendingAction !== null;

  return (
    <div className="h-14 bg-card-bg border-b border-border-neutral flex items-center px-4 gap-2 sticky top-0 z-40 shadow-sm print:hidden">
      {/* Left: Save actions */}
      <div className="flex items-center gap-1.5">
        <AsyncButton
          onClick={onSaveDraft}
          pending={isSaving || pendingAction === "save"}
          pendingLabel={<span className="hidden sm:inline">Salvando...</span>}
          disabled={hasPendingRemoteAction && pendingAction !== "save"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salvar Rascunho</span>
        </AsyncButton>

        <AsyncButton
          onClick={onSaveAsTemplate}
          pending={pendingAction === "template"}
          pendingLabel={<span className="hidden md:inline">Salvando...</span>}
          disabled={hasPendingRemoteAction && pendingAction !== "template"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium disabled:opacity-60"
          title="Salvar como modelo"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Salvar Modelo</span>
        </AsyncButton>

        <AsyncButton
          onClick={onDuplicate}
          pending={pendingAction === "duplicate"}
          pendingLabel={<span className="hidden md:inline">Duplicando...</span>}
          disabled={hasPendingRemoteAction && pendingAction !== "duplicate"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium disabled:opacity-60"
          title="Duplicar"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Duplicar</span>
        </AsyncButton>

        {isTemplate && (
          <AsyncButton
            onClick={onDeleteTemplate}
            pending={pendingAction === "delete"}
            pendingLabel={<span className="hidden md:inline">Excluindo...</span>}
            disabled={hasPendingRemoteAction && pendingAction !== "delete"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors text-sm font-medium disabled:opacity-60"
            title="Excluir modelo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Excluir</span>
          </AsyncButton>
        )}
      </div>

      <div className="h-6 w-px bg-border-neutral mx-1" />

      {/* Center: Layout + tools */}
      <div className="flex items-center gap-1.5">
        {/* Layout picker */}
        <div className="relative">
          <button
            onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowPatientMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{LAYOUTS.find(l => l.id === layoutMode)?.label ?? "Layout"}</span>
          </button>

          {showLayoutMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-card-bg border border-border-neutral rounded-xl shadow-xl z-50 w-56 py-1 overflow-hidden">
                {LAYOUTS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { onLayoutChange(l.id); setShowLayoutMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-warm-beige hover:bg-warm-beige transition-colors flex flex-col ${layoutMode === l.id ? "bg-brand-blue/5 dark:bg-brand-blue/10" : ""}`}
                  >
                    <span className={`text-sm font-semibold ${layoutMode === l.id ? "text-brand-blue" : "text-text-primary"}`}>{l.label}</span>
                    <span className="text-xs text-text-secondary">{l.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onCopyMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium"
          title="Copiar como Markdown"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Markdown</span>
        </button>

        <button
          onClick={onSmartPaste}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium"
          title="Colar inteligente"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Colar</span>
        </button>
      </div>

      <div className="h-6 w-px bg-border-neutral mx-1" />

      {/* Right: Patient + PDF */}
      <div className="flex items-center gap-1.5">
        {isTemplate && patients.length > 0 && (
          <div className="relative">
            <AsyncButton
              onClick={() => { setShowPatientMenu(!showPatientMenu); setShowLayoutMenu(false); }}
              pending={pendingAction === "apply"}
              pendingLabel={<span className="hidden sm:inline">Aplicando...</span>}
              disabled={hasPendingRemoteAction && pendingAction !== "apply"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Usar p/ Paciente</span>
            </AsyncButton>

            {showPatientMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPatientMenu(false)} />
                <div className="absolute top-full right-0 mt-1 bg-card-bg border border-border-neutral rounded-xl shadow-xl z-50 w-56 py-1 overflow-hidden max-h-64 overflow-y-auto">
                  <p className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase">Selecionar Paciente</p>
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { onUseForPatient(p.id); setShowPatientMenu(false); }}
                      disabled={hasPendingRemoteAction}
                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-warm-beige hover:bg-warm-beige transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <PendingButtonLink
          href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${planId}/pdf`}
          pendingLabel="Abrindo..."
          aria-disabled={hasPendingRemoteAction || undefined}
          onClick={(event) => {
            if (hasPendingRemoteAction) event.preventDefault();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-border-neutral text-text-primary rounded-lg hover:bg-warm-beige hover:bg-warm-beige transition-colors text-sm font-medium ${hasPendingRemoteAction ? "pointer-events-none cursor-wait opacity-60" : ""}`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </PendingButtonLink>
      </div>

      {/* Save status */}
      <div className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary shrink-0">
        {isDirty ? (
          <span className="text-amber-600 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Não salvo
          </span>
        ) : lastSaved ? (
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Salvo
          </span>
        ) : null}
      </div>
    </div>
  );
}
