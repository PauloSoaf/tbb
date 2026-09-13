"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSkinfoldAssessmentAction } from "@/actions/skinfold.action";
import { PROTOCOL_LABELS } from "@/lib/skinfold/protocols";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { SkinfoldProtocol } from "@prisma/client";

type Assessment = {
  id: string;
  protocol: SkinfoldProtocol;
  age: number;
  sex: string;
  bodyFatPct: number | null;
  bodyFatKg: number | null;
  leanMassKg: number | null;
  bodyDensity: number | null;
  weight: number | null;
  notes: string | null;
  assessedAt: Date;
};

interface Props {
  tenantSlug: string;
  patientId: string;
  initialAssessments: Assessment[];
}

export function SkinfoldHistory({ tenantSlug, patientId, initialAssessments }: Props) {
  const { t } = useI18n();
  const [assessments, setAssessments] = useState(initialAssessments);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteSkinfoldAssessmentAction(tenantSlug, id, patientId);
      if (res.success) {
        setAssessments((prev) => prev.filter((a) => a.id !== id));
        toast.success(t("anthropometry.assessment_removed"));
      } else {
        toast.error(res.error ?? "Erro ao remover.");
      }
      setDeletingId(null);
    });
  };

  if (assessments.length === 0) {
    return (
      <div className="bg-card-bg border border-border-neutral rounded-xl p-6 text-center text-sm text-text-secondary">
        {t("anthropometry.no_evaluation_yet")}
      </div>
    );
  }

  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border-neutral">
        <h2 className="text-base font-bold text-text-primary">
          {t("anthropometry.evaluation_history")}
        </h2>
      </div>
      <div className="divide-y divide-border-neutral">
        {assessments.map((a) => (
          <div key={a.id}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-warm-surface transition-colors"
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {PROTOCOL_LABELS[a.protocol as keyof typeof PROTOCOL_LABELS] ?? a.protocol}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {format(new Date(a.assessedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {" · "}{a.sex === "M" ? "Masc." : "Fem."}{" · "}{a.age} anos
                </p>
              </div>
              <div className="flex items-center gap-4">
                {a.bodyFatPct !== null && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-blue">{a.bodyFatPct.toFixed(1)}%</p>
                    <p className="text-xs text-text-secondary">gordura</p>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                  disabled={isPending}
                  className="p-1.5 text-text-secondary hover:text-danger transition-colors"
                >
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                {expanded === a.id ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
              </div>
            </div>
            {expanded === a.id && (
              <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-warm-surface">
                {a.bodyDensity !== null && (
                  <div>
                    <p className="text-xs text-text-secondary">Densidade corporal</p>
                    <p className="font-semibold text-text-primary">{a.bodyDensity.toFixed(4)}</p>
                  </div>
                )}
                {a.bodyFatPct !== null && (
                  <div>
                    <p className="text-xs text-text-secondary">% Gordura</p>
                    <p className="font-semibold text-text-primary">{a.bodyFatPct.toFixed(1)}%</p>
                  </div>
                )}
                {a.bodyFatKg !== null && (
                  <div>
                    <p className="text-xs text-text-secondary">Gordura (kg)</p>
                    <p className="font-semibold text-text-primary">{a.bodyFatKg.toFixed(1)} kg</p>
                  </div>
                )}
                {a.leanMassKg !== null && (
                  <div>
                    <p className="text-xs text-text-secondary">Massa magra</p>
                    <p className="font-semibold text-text-primary">{a.leanMassKg.toFixed(1)} kg</p>
                  </div>
                )}
                {a.weight !== null && (
                  <div>
                    <p className="text-xs text-text-secondary">Peso</p>
                    <p className="font-semibold text-text-primary">{a.weight.toFixed(1)} kg</p>
                  </div>
                )}
                {a.notes && (
                  <div className="col-span-full">
                    <p className="text-xs text-text-secondary">Observações</p>
                    <p className="text-sm text-text-primary">{a.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
