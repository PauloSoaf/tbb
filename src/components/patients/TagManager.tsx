"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createPatientTagAction, deletePatientTagAction } from "@/actions/patient-tag.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#3b82f6",
  "#06b6d4", "#64748b",
];

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface TagManagerProps {
  tenantSlug: string;
  patientId: string;
  initialTags: Tag[];
}

export function TagManager({ tenantSlug, patientId, initialTags }: TagManagerProps) {
  const { t } = useI18n();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!);
  const [adding, setAdding] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());

  const runPendingAction = async (key: string, action: () => Promise<void>) => {
    if (pendingActions.has(key)) return;
    setPendingActions((previous) => new Set(previous).add(key));
    try {
      await action();
    } finally {
      setPendingActions((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  };

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    await runPendingAction("add", async () => {
      const res = await createPatientTagAction(tenantSlug, patientId, trimmed, newColor);
      if (res.success) {
        setTags((prev) => [...prev, { id: crypto.randomUUID(), label: trimmed, color: newColor }]);
        setNewLabel("");
        setAdding(false);
        toast.success(`Tag "${trimmed}" adicionada`);
      } else {
        toast.error(res.error ?? "Erro ao adicionar tag");
      }
    });
  };

  const handleDelete = async (tagId: string, label: string) => {
    await runPendingAction(`delete:${tagId}`, async () => {
      const res = await deletePatientTagAction(tenantSlug, tagId, patientId);
      if (res.success) {
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        toast.success(`Tag "${label}" removida`);
      } else {
        toast.error("Erro ao remover tag");
      }
    });
  };

  return (
    <div className="bg-card-bg rounded-2xl p-4 shadow-sm border border-border-neutral dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary text-sm">{t("patient.tags")}</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-brand-blue hover:text-brand-blue-hover text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("patient.new_tag")}
          </button>
        )}
      </div>

      {tags.length === 0 && !adding && (
        <p className="text-xs text-text-secondary">{t("patient.no_tags")}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.label}
              <button
                onClick={() => handleDelete(t.id, t.label)}
                disabled={pendingActions.has(`delete:${t.id}`)}
                aria-busy={pendingActions.has(`delete:${t.id}`) || undefined}
                className="opacity-70 hover:opacity-100 ml-0.5"
                aria-label={`Remover tag ${t.label}`}
              >
                {pendingActions.has(`delete:${t.id}`)
                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />
                  : <X className="w-2.5 h-2.5" />}
              </button>
            </span>
          ))}
        </div>
      )}

      {adding && (
        <div className="space-y-2 mt-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") { setAdding(false); setNewLabel(""); }
            }}
            placeholder={t("patient.tag_name")}
            maxLength={30}
            autoFocus
            className="w-full text-sm border border-border-neutral dark:border-slate-700 bg-card-bg text-text-primary dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <AsyncButton
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              pending={pendingActions.has("add")}
              pendingLabel={t("patient.saving")}
              className="flex-1 px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg hover:bg-brand-blue-hover disabled:opacity-50 transition-colors"
            >
              {t("patient.add")}
            </AsyncButton>
            <button
              onClick={() => { setAdding(false); setNewLabel(""); }}
              className="px-3 py-1.5 border border-border-neutral dark:border-slate-700 text-text-secondary dark:text-slate-400 text-xs rounded-lg hover:text-text-primary dark:hover:text-slate-200 transition-colors bg-card-bg"
            >
              {t("patient.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
