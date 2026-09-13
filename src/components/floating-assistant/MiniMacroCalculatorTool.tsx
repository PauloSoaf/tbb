"use client";

import { useMemo, useState } from "react";
import { ToolInput } from "./MiniBMICalculatorTool";
import { calculateMacros } from "./macro-calculator";

export function MiniMacroCalculatorTool() {
  const [calories, setCalories] = useState("1800");
  const [protein, setProtein]   = useState("25");
  const [carbs, setCarbs]       = useState("45");
  const [fat, setFat]           = useState("30");

  const result = useMemo(() => {
    const kcal = Number(calories);
    if (!kcal || kcal <= 0) return null;
    return calculateMacros(kcal, Number(protein), Number(carbs), Number(fat));
  }, [calories, protein, carbs, fat]);

  return (
    <div className="space-y-3">
      <ToolInput label="Calorias alvo" value={calories} onChange={setCalories} />
      <div className="grid grid-cols-3 gap-2">
        <ToolInput label="Prot. %" value={protein} onChange={setProtein} />
        <ToolInput label="Carb. %" value={carbs}   onChange={setCarbs} />
        <ToolInput label="Gord. %" value={fat}     onChange={setFat} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MacroResult label="Proteína" value={result ? `${result.proteinG}g` : "--"} colorClass="text-blue-600" bgClass="bg-blue-50 border border-blue-200" />
        <MacroResult label="Carbo"    value={result ? `${result.carbsG}g`   : "--"} colorClass="text-amber-600" bgClass="bg-amber-50 border border-amber-200" />
        <MacroResult label="Gordura"  value={result ? `${result.fatG}g`     : "--"} colorClass="text-rose-600"  bgClass="bg-rose-50 border border-rose-200" />
      </div>
      {result && result.total !== 100 && (
        <p className="text-xs text-amber-700">Soma atual: {result.total}%. Ajuste para 100%.</p>
      )}
    </div>
  );
}

function MacroResult({ label, value, colorClass, bgClass }: { label: string; value: string; colorClass: string; bgClass: string }) {
  return (
    <div className={`rounded-lg p-2 text-center ${bgClass}`}>
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className={`font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
