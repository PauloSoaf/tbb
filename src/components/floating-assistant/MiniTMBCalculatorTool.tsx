"use client";

import { useMemo, useState } from "react";
import { ToolInput } from "./MiniBMICalculatorTool";
import { calculateTmb } from "./tmb-calculator";
import { Info } from "lucide-react";

const ACTIVITY_FACTORS = [
  { label: "Sedentário", value: 1.2 },
  { label: "Leve (1-3x/sem)", value: 1.375 },
  { label: "Moderado (3-5x/sem)", value: 1.55 },
  { label: "Intenso (6-7x/sem)", value: 1.725 },
  { label: "Muito intenso", value: 1.9 },
];

export function MiniTMBCalculatorTool() {
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const [age, setAge] = useState("30");
  const [sex, setSex] = useState<"M" | "F">("F");
  const [factor, setFactor] = useState(1.55);

  const result = useMemo(() => {
    const w = Number(weight.replace(",", "."));
    const h = Number(height.replace(",", "."));
    const a = Number(age.replace(",", "."));
    if (!w || !h || !a) return null;
    return calculateTmb(w, h, a, sex, factor);
  }, [weight, height, age, sex, factor]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["F", "M"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSex(s)}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
              sex === s
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border-neutral text-text-secondary hover:border-brand-blue/40"
            }`}
          >
            {s === "F" ? "Feminino" : "Masculino"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ToolInput label="Peso (kg)" value={weight} onChange={setWeight} />
        <ToolInput label="Altura (cm)" value={height} onChange={setHeight} />
        <ToolInput label="Idade" value={age} onChange={setAge} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-text-secondary">Nível de atividade</p>
        <select
          value={factor}
          onChange={(e) => setFactor(Number(e.target.value))}
          className="w-full rounded-lg border border-border-neutral px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
        >
          {ACTIVITY_FACTORS.map((af) => (
            <option key={af.label} value={af.value}>{af.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-warm p-3 text-center">
          <p className="text-xs text-text-secondary flex items-center justify-center gap-1">
            TMB
            <span title="Taxa Metabólica Basal: Energia necessária para manter as funções vitais em repouso.">
              <Info className="w-3 h-3 text-text-tertiary" />
            </span>
          </p>
          <p className="text-xl font-bold text-text-primary">{result ? `${result.tmb}` : "--"}</p>
          <p className="text-[10px] text-text-secondary">kcal/dia</p>
        </div>
        <div className="rounded-lg bg-brand-blue/10 p-3 text-center">
          <p className="text-xs text-brand-blue font-medium flex items-center justify-center gap-1">
            GET
            <span title="Gasto Energético Total: Energia total gasta, incluindo atividades e exercícios.">
              <Info className="w-3 h-3 opacity-70" />
            </span>
          </p>
          <p className="text-xl font-bold text-brand-blue">{result ? `${result.get}` : "--"}</p>
          <p className="text-[10px] text-brand-blue/70">kcal/dia</p>
        </div>
      </div>
      <p className="text-[10px] text-text-secondary">Mifflin-St Jeor. Revisão clínica necessária.</p>
    </div>
  );
}
