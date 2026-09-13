"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Heart, Info } from "lucide-react";
import { getRCQRisk, getWaistRisk } from "@/lib/utils/clinical-risk";
import { useI18n } from "@/lib/i18n/I18nContext";

const ACTIVITY_FACTORS: { label: string; value: number }[] = [
  { label: "Sedentário (sem exercício)", value: 1.2 },
  { label: "Levemente ativo (1-3x/sem)", value: 1.375 },
  { label: "Moderadamente ativo (3-5x/sem)", value: 1.55 },
  { label: "Muito ativo (6-7x/sem)", value: 1.725 },
  { label: "Extremamente ativo (atleta/trabalho físico)", value: 1.9 },
];

export default function CalculadorasPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const { t } = useI18n();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [tmbWeight, setTmbWeight] = useState("");
  const [tmbHeight, setTmbHeight] = useState("");
  const [tmbAge, setTmbAge] = useState("");
  const [tmbSex, setTmbSex] = useState<"M" | "F">("F");
  const [tmbActivity, setTmbActivity] = useState(1.55);
  const [rcqWaist, setRcqWaist] = useState("");
  const [rcqHip, setRcqHip] = useState("");
  const [rcqSex, setRcqSex] = useState<"M" | "F">("F");
  const [waistCm, setWaistCm] = useState("");
  const [waistSex, setWaistSex] = useState<"M" | "F">("F");

  // IMC
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  const imc = w > 0 && h > 0 ? (w / (h * h)).toFixed(1) : null;
  const getImcClass = (val: number) => {
    if (val < 18.5) return t("tools.calculators.imc_underweight", { defaultValue: "Abaixo do peso" });
    if (val < 25) return t("tools.calculators.imc_normal", { defaultValue: "Peso normal" });
    if (val < 30) return t("tools.calculators.imc_overweight", { defaultValue: "Sobrepeso" });
    if (val < 35) return t("tools.calculators.imc_obesity_1", { defaultValue: "Obesidade Grau 1" });
    if (val < 40) return t("tools.calculators.imc_obesity_2", { defaultValue: "Obesidade Grau 2" });
    return t("tools.calculators.imc_obesity_3", { defaultValue: "Obesidade Grau 3" });
  };

  // TMB (Mifflin-St Jeor)
  const tw = parseFloat(tmbWeight);
  const th = parseFloat(tmbHeight);
  const ta = parseFloat(tmbAge);
  let tmb: number | null = null;
  let vet: number | null = null;
  if (tw > 0 && th > 0 && ta > 0) {
    const base = 10 * tw + 6.25 * th - 5 * ta;
    tmb = tmbSex === "M" ? base + 5 : base - 161;
    vet = tmb * tmbActivity;
  }

  // RCQ
  const rWaist = parseFloat(rcqWaist);
  const rHip = parseFloat(rcqHip);
  const rcq = rWaist > 0 && rHip > 0 ? rWaist / rHip : null;
  const rcqRisk = rcq !== null ? getRCQRisk(rcq, rcqSex) : null;

  // Waist risk
  const waistVal = parseFloat(waistCm);
  const waistRisk = waistVal > 0 ? getWaistRisk(waistVal, waistSex) : null;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 dark:bg-card-bg text-text-primary dark:text-slate-200 focus:border-brand-blue focus:ring-1 focus:outline-none";

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${tenant}/ferramentas`}
          className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("tools.back_to_tools", { defaultValue: "Voltar para Ferramentas" })}
        </Link>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Calculator className="w-6 h-6 text-brand-blue" />
          {t("tools.calculators.title", { defaultValue: "Calculadoras Clínicas" })}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IMC */}
        <div className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4 flex items-center gap-1">
            {t("tools.calculators.imc_title", { defaultValue: "Índice de Massa Corporal (IMC)" })}
            <div className="group relative inline-flex items-center">
              <Info className="w-4 h-4 text-text-secondary cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-normal">
                {t("tools.calculators.imc_tooltip", { defaultValue: "Medida internacional usada para calcular se uma pessoa está no peso ideal." })}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.weight_kg", { defaultValue: "Peso (kg)" })}</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70.5" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.height_cm", { defaultValue: "Altura (cm)" })}</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className={inputClass} />
            </div>
            {imc && (
              <div className="pt-4 border-t border-border-neutral">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">IMC:</span>
                  <span className="text-2xl font-bold text-brand-blue">{imc}</span>
                </div>
                <div className="text-right mt-1">
                  <span className="text-sm font-semibold text-text-secondary bg-gray-100 dark:bg-card-bg px-2 py-1 rounded-full">
                    {getImcClass(parseFloat(imc))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TMB + VET */}
        <div className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-1 flex items-center gap-1">
            {t("tools.calculators.tmb_vet_title", { defaultValue: "TMB e VET" })}
            <div className="group relative inline-flex items-center">
              <Info className="w-4 h-4 text-text-secondary cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t("tools.calculators.tmb_vet_tooltip", { defaultValue: "TMB (Taxa Metabólica Basal) é a energia necessária para manter as funções vitais em repouso. VET (Valor Energético Total) é a energia total gasta incluindo as atividades diárias e exercícios." })}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </h2>
          <p className="text-xs text-text-secondary mb-4">{t("tools.calculators.formula_mifflin", { defaultValue: "Fórmula Mifflin-St Jeor" })}</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.weight_kg", { defaultValue: "Peso (kg)" })}</label>
                <input type="number" value={tmbWeight} onChange={(e) => setTmbWeight(e.target.value)} placeholder="70" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.height_cm", { defaultValue: "Altura (cm)" })}</label>
                <input type="number" value={tmbHeight} onChange={(e) => setTmbHeight(e.target.value)} placeholder="165" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.age", { defaultValue: "Idade" })}</label>
                <input type="number" value={tmbAge} onChange={(e) => setTmbAge(e.target.value)} placeholder="30" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.gender", { defaultValue: "Sexo" })}</label>
                <select value={tmbSex} onChange={(e) => setTmbSex(e.target.value as "M" | "F")} className={inputClass}>
                  <option value="F">{t("tools.calculators.female", { defaultValue: "Feminino" })}</option>
                  <option value="M">{t("tools.calculators.male", { defaultValue: "Masculino" })}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.activity_level", { defaultValue: "Nível de atividade" })}</label>
              <select value={tmbActivity} onChange={(e) => setTmbActivity(parseFloat(e.target.value))} className={inputClass}>
                {ACTIVITY_FACTORS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {tmb !== null && vet !== null && (
              <div className="pt-3 border-t border-border-neutral space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t("tools.calculators.tmb_rest", { defaultValue: "TMB (repouso):" })}</span>
                  <span className="text-lg font-bold text-text-primary dark:text-slate-200">{Math.round(tmb)} kcal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t("tools.calculators.vet_total", { defaultValue: "VET (gasto total):" })}</span>
                  <span className="text-xl font-bold text-brand-blue">{Math.round(vet)} kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border-neutral">
                  {[
                    { label: t("tools.calculators.weight_loss", { defaultValue: "Emagrecimento (−500)" }), kcal: Math.round(vet - 500), color: "text-rose-600 dark:text-rose-400" },
                    { label: t("tools.calculators.maintenance", { defaultValue: "Manutenção" }), kcal: Math.round(vet), color: "text-emerald-600 dark:text-emerald-400" },
                    { label: t("tools.calculators.weight_gain", { defaultValue: "Ganho (+300)" }), kcal: Math.round(vet + 300), color: "text-blue-600 dark:text-blue-400" },
                  ].map((c) => (
                    <div key={c.label} className="text-center bg-gray-50 dark:bg-card-bg rounded-lg p-2">
                      <p className={`text-sm font-bold ${c.color}`}>{c.kcal}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RCQ */}
        <div className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-text-primary dark:text-slate-200 flex items-center gap-1">
              {t("tools.calculators.rcq_title", { defaultValue: "Relação Cintura-Quadril (RCQ)" })}
              <div className="group relative inline-flex items-center">
                <Info className="w-4 h-4 text-text-secondary cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-normal">
                  {t("tools.calculators.rcq_tooltip", { defaultValue: "Avalia o risco para a saúde baseado na distribuição de gordura." })}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </h2>
          </div>
          <p className="text-xs text-text-secondary mb-4">{t("tools.calculators.rcq_desc", { defaultValue: "Referência OMS — risco cardiovascular metabólico" })}</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.waist_cm", { defaultValue: "Cintura (cm)" })}</label>
                <input type="number" value={rcqWaist} onChange={(e) => setRcqWaist(e.target.value)} placeholder="78" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.hip_cm", { defaultValue: "Quadril (cm)" })}</label>
                <input type="number" value={rcqHip} onChange={(e) => setRcqHip(e.target.value)} placeholder="98" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.gender", { defaultValue: "Sexo" })}</label>
              <select value={rcqSex} onChange={(e) => setRcqSex(e.target.value as "M" | "F")} className={inputClass}>
                <option value="F">{t("tools.calculators.female", { defaultValue: "Feminino" })}</option>
                <option value="M">{t("tools.calculators.male", { defaultValue: "Masculino" })}</option>
              </select>
            </div>
            {rcq !== null && rcqRisk && (
              <div className="pt-3 border-t border-border-neutral space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">RCQ:</span>
                  <span className="text-2xl font-bold text-brand-blue">{rcq.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-card-bg ${rcqRisk.color}`}>
                    {rcqRisk.label}
                  </span>
                </div>
                <div className="text-xs text-text-secondary bg-gray-50 dark:bg-card-bg rounded-lg p-3">
                  <p className="font-medium mb-1">{t("tools.calculators.oms_ref", { defaultValue: "Referência OMS" })} ({rcqSex === "F" ? t("tools.calculators.female", { defaultValue: "Feminino" }) : t("tools.calculators.male", { defaultValue: "Masculino" })}):</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>{"< "}{rcqSex === "F" ? "0,71" : "0,82"} → {t("tools.calculators.low", { defaultValue: "Baixo" })}</span>
                    <span>{rcqSex === "F" ? "0,71–0,77" : "0,82–0,87"} → {t("tools.calculators.moderate", { defaultValue: "Moderado" })}</span>
                    <span>{rcqSex === "F" ? "0,78–0,81" : "0,88–0,94"} → {t("tools.calculators.high", { defaultValue: "Alto" })}</span>
                    <span>{"≥ "}{rcqSex === "F" ? "0,82" : "0,95"} → {t("tools.calculators.very_high", { defaultValue: "Muito alto" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Circunferência da Cintura */}
        <div className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-text-primary dark:text-slate-200">{t("tools.calculators.waist_circumference_title", { defaultValue: "Risco por Circunferência da Cintura" })}</h2>
          </div>
          <p className="text-xs text-text-secondary mb-4">{t("tools.calculators.waist_circumference_desc", { defaultValue: "Referência OMS / IDF — risco cardiovascular e metabólico" })}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.waist_circumference", { defaultValue: "Circunferência da cintura (cm)" })}</label>
              <input type="number" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} placeholder="80" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">{t("tools.calculators.gender", { defaultValue: "Sexo" })}</label>
              <select value={waistSex} onChange={(e) => setWaistSex(e.target.value as "M" | "F")} className={inputClass}>
                <option value="F">{t("tools.calculators.female", { defaultValue: "Feminino" })}</option>
                <option value="M">{t("tools.calculators.male", { defaultValue: "Masculino" })}</option>
              </select>
            </div>
            {waistRisk && (
              <div className="pt-3 border-t border-border-neutral space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t("tools.calculators.classification", { defaultValue: "Classificação:" })}</span>
                  <span className={`text-base font-bold ${waistRisk.color}`}>{t((waistRisk as any).labelKey, { defaultValue: waistRisk.label })}</span>
                </div>
                <div className="text-xs text-text-secondary bg-gray-50 dark:bg-card-bg rounded-lg p-3">{t((waistRisk as any).detailKey, { defaultValue: waistRisk.detail })}</div>
                <div className="text-xs text-text-secondary bg-gray-50 dark:bg-card-bg rounded-lg p-3">
                  <p className="font-medium mb-1">{t("tools.calculators.oms_cutoffs", { defaultValue: "Pontos de corte OMS" })} ({waistSex === "F" ? t("tools.calculators.female", { defaultValue: "Feminino" }) : t("tools.calculators.male", { defaultValue: "Masculino" })}):</p>
                  {waistSex === "F" ? (
                    <span>{t("tools.calculators.cutoffs_female", { defaultValue: "< 80 cm: sem risco · 80–87 cm: aumentado · ≥ 88 cm: muito alto" })}</span>
                  ) : (
                    <span>{t("tools.calculators.cutoffs_male", { defaultValue: "< 94 cm: sem risco · 94–101 cm: aumentado · ≥ 102 cm: muito alto" })}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
