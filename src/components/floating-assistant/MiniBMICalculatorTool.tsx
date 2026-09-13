"use client";

import { useMemo, useState } from "react";
import { classifyBmi, type BmiClass } from "./bmi-classification";

const BG: Record<BmiClass, string> = {
  low:       "bg-amber-50 border border-amber-200",
  normal:    "bg-emerald-50 border border-emerald-200",
  overweight:"bg-amber-50 border border-amber-200",
  obese1:    "bg-rose-50 border border-rose-200",
  obese2:    "bg-rose-50 border border-rose-200",
  obese3:    "bg-rose-50 border border-rose-200",
};

const TEXT: Record<BmiClass, string> = {
  low:       "text-amber-700",
  normal:    "text-emerald-700",
  overweight:"text-amber-700",
  obese1:    "text-rose-700",
  obese2:    "text-rose-700",
  obese3:    "text-rose-700",
};

export function MiniBMICalculatorTool() {
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");

  const result = useMemo(() => {
    const w = Number(weight.replace(",", "."));
    const h = Number(height.replace(",", ".")) / 100;
    if (!w || !h) return null;
    const bmi = w / (h * h);
    return { value: bmi.toFixed(1), ...classifyBmi(bmi) };
  }, [weight, height]);

  return (
    <div className="space-y-3">
      <ToolInput label="Peso (kg)" value={weight} onChange={setWeight} />
      <ToolInput label="Altura (cm)" value={height} onChange={setHeight} />
      <div className={`rounded-lg p-3 ${result ? BG[result.cls] : "bg-surface-warm"}`}>
        <p className="text-xs text-text-secondary">IMC estimado</p>
        <p className={`text-2xl font-bold ${result ? TEXT[result.cls] : "text-text-primary"}`}>
          {result?.value ?? "--"}
        </p>
        <p className={`text-sm font-medium ${result ? TEXT[result.cls] : "text-text-secondary"}`}>
          {result?.label ?? "Informe peso e altura"}
        </p>
      </div>
    </div>
  );
}

export function ToolInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="w-full rounded-lg border border-border-neutral bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
      />
    </label>
  );
}
