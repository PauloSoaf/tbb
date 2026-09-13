"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FileText, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { addPatientNoteAction } from "@/actions/patient-timeline.action";

type ProntuarioMode = "EVOLUCAO" | "CONDUTA" | "QUEIXA" | "RETORNO" | "ORIENTACAO";

const modes: Array<{ value: ProntuarioMode; label: string; title: string }> = [
  { value: "EVOLUCAO", label: "Evolucao", title: "Prontuario - Evolucao" },
  { value: "CONDUTA", label: "Conduta", title: "Prontuario - Conduta nutricional" },
  { value: "QUEIXA", label: "Queixa", title: "Prontuario - Queixa principal" },
  { value: "RETORNO", label: "Retorno", title: "Prontuario - Retorno" },
  { value: "ORIENTACAO", label: "Orientacao", title: "Prontuario - Orientacoes ao paciente" },
];

interface PatientProntuarioComposerProps {
  patientId: string;
  patientName: string;
}

export function PatientProntuarioComposer({
  patientId,
  patientName,
}: PatientProntuarioComposerProps) {
  const [mode, setMode] = useState<ProntuarioMode>("EVOLUCAO");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMode = useMemo(
    () => modes.find((item) => item.value === mode) ?? modes[0],
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSaving(true);
    const result = await addPatientNoteAction(patientId, text, selectedMode.title);
    setSaving(false);

    if (result.success) {
      toast.success("Registro salvo no prontuario");
      setBody("");
    } else {
      toast.error(result.error || "Erro ao salvar prontuario");
    }
  }

  return (
    <form
      id="prontuario"
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-brand-blue/25 bg-card-bg shadow-sm ring-1 ring-brand-blue/5"
    >
      <div className="border-b border-border-neutral bg-gradient-to-r from-brand-blue/10 via-warm-surface to-warm-beige/70 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
                Prontuario do paciente
              </p>
              <h2 className="text-lg font-bold text-text-primary">
                Registro clinico de {patientName}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Area principal para evolucao, conduta, queixas e orientacoes da consulta.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === item.value
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-border-neutral bg-card-bg text-text-secondary hover:border-brand-blue/40 hover:text-brand-blue"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={saving}
          rows={8}
          placeholder="Escreva aqui a evolucao do atendimento, conduta nutricional, resposta do paciente, sintomas relatados, combinados e proximos passos."
          className="min-h-[180px] w-full resize-y rounded-xl border border-border-neutral bg-warm-surface px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15 disabled:opacity-70"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-blue" />
            <span>{selectedMode.label} sera salvo separado das notas clinicas rapidas.</span>
          </div>
          <button
            type="submit"
            disabled={!body.trim() || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar no prontuario
          </button>
        </div>
      </div>
    </form>
  );
}
