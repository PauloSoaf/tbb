"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSkinfoldAssessmentAction } from "@/actions/skinfold.action";
import {
  PROTOCOL_LABELS,
  PROTOCOL_FIELDS,
  FIELD_LABELS,
  calculateSkinfold,
  type Protocol,
  type SkinfoldInput,
} from "@/lib/skinfold/protocols";

interface Props {
  tenantSlug: string;
  patientId: string;
  patientSex?: "M" | "F";
  patientAge?: number;
}

const PROTOCOLS = Object.keys(PROTOCOL_LABELS) as Protocol[];

export function SkinfoldForm({ tenantSlug, patientId, patientSex, patientAge }: Props) {
  const [isPending, startTransition] = useTransition();
  const [protocol, setProtocol] = useState<Protocol>("POLLOCK_7");
  const [sex, setSex] = useState<"M" | "F">(patientSex ?? "F");
  const [age, setAge] = useState(patientAge ?? 30);
  const [weight, setWeight] = useState<string>("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ReturnType<typeof calculateSkinfold> | null>(null);

  const requiredFields = PROTOCOL_FIELDS[protocol];

  const getInput = (): SkinfoldInput => ({
    age,
    sex,
    weight: weight ? parseFloat(weight) : undefined,
    ...Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v ? parseFloat(v) : undefined])
    ),
  });

  const handlePreview = () => {
    try {
      const result = calculateSkinfold(protocol, getInput());
      setPreview(result);
    } catch {
      toast.error("Preencha todos os campos obrigatórios.");
    }
  };

  const handleSubmit = () => {
    const input = getInput();
    startTransition(async () => {
      const res = await createSkinfoldAssessmentAction(tenantSlug, patientId, {
        protocol,
        age: input.age,
        sex: input.sex,
        weight: input.weight,
        chest: input.chest,
        axillary: input.axillary,
        triceps: input.triceps,
        subscapular: input.subscapular,
        abdominal: input.abdominal,
        suprailiac: input.suprailiac,
        thigh: input.thigh,
        medialCalf: input.medialCalf,
      });
      if (res.assessment) {
        toast.success("Avaliação salva!");
        setFields({});
        setWeight("");
        setPreview(null);
      } else {
        toast.error(res.error ?? "Erro ao salvar.");
      }
    });
  };

  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl p-6 space-y-5">
      <h2 className="text-base font-bold text-text-primary">Nova Avaliação</h2>

      {/* Protocol + basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Protocolo</label>
          <select
            value={protocol}
            onChange={(e) => { setProtocol(e.target.value as Protocol); setPreview(null); }}
            className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>{PROTOCOL_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sexo</label>
          <div className="flex gap-3">
            {(["M", "F"] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="sex" value={s} checked={sex === s} onChange={() => setSex(s)} className="accent-brand-blue" />
                <span className="text-sm">{s === "M" ? "Masc." : "Fem."}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Idade</label>
          <input
            type="number" min={10} max={99} value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 30)}
            className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
      </div>

      {/* Weight */}
      <div className="max-w-xs">
        <label className="block text-xs font-medium text-text-secondary mb-1">Peso (kg) — opcional para calcular massa</label>
        <input
          type="number" step="0.1" value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Ex: 72.5"
          className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      {/* Skinfold inputs */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Dobras cutâneas (mm)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {requiredFields.map((field) => (
            <div key={field as string}>
              <label className="block text-xs text-text-secondary mb-1">{FIELD_LABELS[field as string]}</label>
              <input
                type="number" step="0.1" min="0"
                value={fields[field as string] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [field as string]: e.target.value }))}
                placeholder="mm"
                className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview result */}
      {preview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {preview.bodyDensity && (
            <div>
              <p className="text-xs text-text-secondary">Densidade</p>
              <p className="text-lg font-bold text-text-primary">{preview.bodyDensity.toFixed(4)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-secondary">% Gordura</p>
            <p className="text-lg font-bold text-text-primary">{preview.bodyFatPct.toFixed(1)}%</p>
          </div>
          {preview.bodyFatKg && (
            <div>
              <p className="text-xs text-text-secondary">Gordura (kg)</p>
              <p className="text-lg font-bold text-text-primary">{preview.bodyFatKg.toFixed(1)} kg</p>
            </div>
          )}
          {preview.leanMassKg && (
            <div>
              <p className="text-xs text-text-secondary">Massa magra</p>
              <p className="text-lg font-bold text-text-primary">{preview.leanMassKg.toFixed(1)} kg</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePreview}
          className="px-4 py-2 border border-brand-blue text-brand-blue text-sm font-medium rounded-lg hover:bg-brand-blue-soft transition-colors"
        >
          Calcular
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-brand-blue-hover transition-colors"
        >
          {isPending ? "Salvando..." : "Salvar avaliação"}
        </button>
      </div>
    </div>
  );
}
