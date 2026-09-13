"use client";

import { useMemo, useState } from "react";
import { ToolInput } from "./MiniBMICalculatorTool";
import { calculateWater } from "./water-calculator";

export function MiniCalculatorTool() {
  const [weight, setWeight] = useState("70");
  const [mlPerKg, setMlPerKg] = useState("35");

  const result = useMemo(() => {
    const kg = Number(weight.replace(",", "."));
    const ratio = Number(mlPerKg.replace(",", "."));
    const range = calculateWater(kg);
    if (!kg || !ratio) return { range, customMl: 0, customL: 0 };
    const customMl = Math.round(kg * ratio);
    return { range, customMl, customL: Number((customMl / 1000).toFixed(2)) };
  }, [mlPerKg, weight]);

  return (
    <div className="space-y-3">
      <ToolInput label="Peso (kg)" value={weight} onChange={setWeight} />
      <ToolInput label="ml por kg" value={mlPerKg} onChange={setMlPerKg} />
      <div className={`rounded-lg p-3 ${result.customMl ? "border border-sky-200 bg-sky-50 dark:bg-sky-500/10" : "bg-surface-warm"}`}>
        <p className="text-xs text-text-secondary">Agua diaria estimada</p>
        <p className={`text-2xl font-bold ${result.customMl ? "text-sky-700 dark:text-sky-300" : "text-text-primary"}`}>
          {result.customMl ? `${result.customL} L` : "--"}
        </p>
        {result.customMl > 0 ? (
          <p className="text-xs text-sky-600 dark:text-sky-300">
            {result.customMl} ml - referencia 30-35 ml/kg: {result.range?.minMl}-{result.range?.maxMl} ml
          </p>
        ) : (
          <p className="text-xs text-text-secondary">Ajuste clinico conforme caso.</p>
        )}
      </div>
    </div>
  );
}
