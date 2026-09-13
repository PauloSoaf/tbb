"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Calculator, ChevronDown, ChevronUp, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  calculateSkinfoldAssessment,
  getAvailableSkinfoldProtocols,
  getDefaultSkinfoldProtocol,
  isClinicalSkinfoldProtocol,
  parseSkinfoldMeasurements,
  serializeSkinfoldMeasurementsJson,
  type AssessmentProfile,
  type BiologicalSex,
  type ClinicalSkinfoldProtocol,
  type SkinfoldMeasurements,
  type SkinfoldSite,
} from "@/lib/anthropometry";

export type ClinicalSkinfoldPanelValue = {
  skinfoldProtocol: ClinicalSkinfoldProtocol | null;
  skinfoldMeasurements: string | null;
  skinfoldSum: number | null;
  skinfoldBodyDensity: number | null;
  skinfoldFormula: string | null;
  bodyFatPercentage: number | null;
  bodyFatKg: number | null;
  leanMassKg: number | null;
};

type ClinicalSkinfoldPanelProps = {
  profile: AssessmentProfile;
  biologicalSex: BiologicalSex;
  assessmentAge: number | null | undefined;
  weight: number | null | undefined;
  initialProtocol?: string | null;
  initialMeasurements?: string | null;
  onChange: (value: ClinicalSkinfoldPanelValue) => void;
};

const SITE_TEXT: Record<SkinfoldSite, { key: string; fallback: string }> = {
  chest: { key: "site_chest", fallback: "Peitoral" },
  axillary: { key: "site_axillary", fallback: "Axilar média" },
  triceps: { key: "site_triceps", fallback: "Tríceps" },
  biceps: { key: "site_biceps", fallback: "Bíceps" },
  subscapular: { key: "site_subscapular", fallback: "Subescapular" },
  abdominal: { key: "site_abdominal", fallback: "Abdominal" },
  suprailiac: { key: "site_suprailiac", fallback: "Suprailíaca" },
  supraSpinal: { key: "site_supraspinal", fallback: "Supraespinal" },
  thigh: { key: "site_thigh", fallback: "Coxa" },
  medialCalf: { key: "site_medial_calf", fallback: "Panturrilha medial" },
};

const PROTOCOL_TEXT: Record<ClinicalSkinfoldProtocol, { key: string; fallback: string }> = {
  POLLOCK_3_MALE: { key: "protocol_pollock_3_male", fallback: "Jackson-Pollock 3 dobras (masculino)" },
  POLLOCK_3_FEMALE: { key: "protocol_pollock_3_female", fallback: "Jackson-Pollock 3 dobras (feminino)" },
  POLLOCK_7: { key: "protocol_pollock_7", fallback: "Jackson-Pollock 7 dobras" },
  DURNIN_WOMERSLEY: { key: "protocol_durnin_womersley", fallback: "Durnin-Womersley 4 dobras" },
  SLAUGHTER: { key: "protocol_slaughter", fallback: "Slaughter (criança/adolescente)" },
  MANUAL: { key: "protocol_manual", fallback: "Protocolo manual (somente soma)" },
};

const WARNING_TEXT: Record<string, { key: string; fallback: string }> = {
  AGE_REQUIRED: { key: "warning_age_required", fallback: "Informe a idade usada nesta avaliação para aplicar a fórmula." },
  SEX_REQUIRED: { key: "warning_sex_required", fallback: "Informe o sexo biológico usado pela fórmula." },
  PROTOCOL_SEX_MISMATCH: { key: "warning_protocol_sex_mismatch", fallback: "O protocolo selecionado não corresponde ao sexo biológico informado." },
  PROFILE_NOT_SUPPORTED: { key: "warning_profile_not_supported", fallback: "Este protocolo não é aplicável ao perfil clínico selecionado." },
  AGE_OUTSIDE_REFERENCE: { key: "warning_age_outside_reference", fallback: "A idade está fora da faixa de referência principal desta fórmula; interprete com cautela." },
  MISSING_REQUIRED_READINGS: { key: "warning_missing_readings", fallback: "Preencha ao menos uma leitura para cada dobra exigida pelo protocolo." },
  READING_VARIATION_HIGH: { key: "warning_variation_high", fallback: "Há grande variação entre leituras. Refaça a aferição antes de interpretar o resultado." },
  MANUAL_PROTOCOL_NO_BODY_FAT: { key: "warning_manual_no_body_fat", fallback: "O protocolo manual registra a soma das dobras, mas não estima percentual de gordura." },
};

function toNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function displayNumber(value: number | null, decimals = 1): string {
  return value === null ? "—" : value.toFixed(decimals).replace(".", ",");
}

export function ClinicalSkinfoldPanel({
  profile,
  biologicalSex,
  assessmentAge,
  weight,
  initialProtocol,
  initialMeasurements,
  onChange,
}: ClinicalSkinfoldPanelProps) {
  const { t } = useI18n();
  const tx = (key: string, fallback: string) => t(`anthropometry_clinical.${key}`, { defaultValue: fallback });
  const initiallyEnabled = isClinicalSkinfoldProtocol(initialProtocol);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [protocol, setProtocol] = useState<ClinicalSkinfoldProtocol>(() =>
    isClinicalSkinfoldProtocol(initialProtocol)
      ? initialProtocol
      : getDefaultSkinfoldProtocol(profile, biologicalSex)
  );
  const [measurements, setMeasurements] = useState<SkinfoldMeasurements>(() =>
    parseSkinfoldMeasurements(initialMeasurements)
  );
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const availableProtocols = useMemo(() => getAvailableSkinfoldProtocols(profile), [profile]);
  // Profile changes can make a previously selected protocol unavailable. Derive
  // a valid protocol for this render instead of synchronously resetting state
  // in an effect; switching back still preserves the nutritionist's choice.
  const activeProtocol = availableProtocols.includes(protocol)
    ? protocol
    : getDefaultSkinfoldProtocol(profile, biologicalSex);

  const calculation = useMemo(
    () => enabled
        ? calculateSkinfoldAssessment({
          protocol: activeProtocol,
          profile,
          sex: biologicalSex,
          age: assessmentAge,
          weight,
          measurements,
        })
      : null,
    [activeProtocol, assessmentAge, biologicalSex, enabled, measurements, profile, weight]
  );

  useEffect(() => {
    if (!enabled || !calculation) {
      onChangeRef.current({
        skinfoldProtocol: null,
        skinfoldMeasurements: null,
        skinfoldSum: null,
        skinfoldBodyDensity: null,
        skinfoldFormula: null,
        bodyFatPercentage: null,
        bodyFatKg: null,
        leanMassKg: null,
      });
      return;
    }

    onChangeRef.current({
      skinfoldProtocol: activeProtocol,
      skinfoldMeasurements: serializeSkinfoldMeasurementsJson(measurements),
      skinfoldSum: calculation.sum,
      skinfoldBodyDensity: calculation.bodyDensity,
      skinfoldFormula: calculation.formula,
      bodyFatPercentage: calculation.bodyFatPercentage,
      bodyFatKg: calculation.bodyFatKg,
      leanMassKg: calculation.leanMassKg,
    });
  }, [activeProtocol, calculation, enabled, measurements]);

  const selectedSites = calculation?.requiredSites ?? [];
  const visibleSites = activeProtocol === "MANUAL"
    ? [
        "triceps",
        "biceps",
        "subscapular",
        "suprailiac",
        "supraSpinal",
        "abdominal",
        "chest",
        "axillary",
        "thigh",
        "medialCalf",
      ] as SkinfoldSite[]
    : [...selectedSites];

  const updateReading = (site: SkinfoldSite, reading: "first" | "second" | "third", value: string) => {
    setMeasurements((current) => {
      const currentSite = current[site] ?? {};
      const nextSite = { ...currentSite, [reading]: toNullableNumber(value) };
      const values = [nextSite.first, nextSite.second, nextSite.third, nextSite.average];
      if (values.every((entry) => entry === null || entry === undefined)) {
        const nextMeasurements = { ...current };
        delete nextMeasurements[site];
        return nextMeasurements;
      }
      return { ...current, [site]: nextSite };
    });
  };

  const reset = () => {
    setMeasurements({});
    setProtocol(getDefaultSkinfoldProtocol(profile, biologicalSex));
  };

  return (
    <section className="rounded-xl border border-border-neutral bg-card-bg shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border-neutral p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <Activity className="h-4 w-4 text-brand-blue" />
            {tx("skinfold_title", "Dobras cutâneas e adipômetro")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {tx("skinfold_description", "Registre até três leituras por ponto para calcular a média e acompanhar a confiabilidade da aferição.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-neutral px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-warm-surface"
          aria-expanded={enabled}
        >
          {enabled ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {enabled
            ? tx("hide_skinfold", "Ocultar dobras")
            : tx("add_skinfold", "Adicionar dobras")}
        </button>
      </div>

      {enabled && (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label htmlFor="clinical-skinfold-protocol" className="mb-1.5 block text-sm font-medium text-text-primary">
                {tx("protocol_label", "Protocolo")}
              </label>
              <select
                id="clinical-skinfold-protocol"
                value={activeProtocol}
                onChange={(event) => setProtocol(event.target.value as ClinicalSkinfoldProtocol)}
                className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              >
                {availableProtocols.map((item) => (
                  <option key={item} value={item}>
                    {tx(PROTOCOL_TEXT[item].key, PROTOCOL_TEXT[item].fallback)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border-neutral px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-warm-surface"
            >
              <RotateCcw className="h-4 w-4" />
              {tx("clear_protocol", "Limpar protocolo")}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={tx("skinfold_sum", "Soma das dobras")} value={displayNumber(calculation?.sum ?? calculation?.measuredSum ?? null)} suffix="mm" />
            <MetricCard label={tx("body_density", "Densidade corporal")} value={displayNumber(calculation?.bodyDensity ?? null, 4)} />
            <MetricCard label={tx("body_fat_percentage", "% de gordura")} value={displayNumber(calculation?.bodyFatPercentage ?? null)} suffix="%" emphasis />
            <MetricCard label={tx("lean_mass", "Massa magra")} value={displayNumber(calculation?.leanMassKg ?? null)} suffix="kg" />
          </div>

          {calculation?.warnings.map((warning) => {
            const message = WARNING_TEXT[warning];
            return (
              <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {tx(message.key, message.fallback)}
              </div>
            );
          })}

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {tx("readings_title", "Leituras por dobra (mm)")}
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {tx("readings_help", "A média é calculada automaticamente com as leituras preenchidas.")}
                </p>
              </div>
              {calculation?.formula && (
                <span className="rounded-full bg-brand-blue-soft px-2.5 py-1 text-xs font-medium text-brand-blue">
                  <Calculator className="mr-1 inline h-3.5 w-3.5" />
                  {calculation.formula}
                </span>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {visibleSites.map((site) => {
                const reading = measurements[site];
                const average = calculation?.averages[site] ?? null;
                const hasHighVariation = calculation?.highVariationSites.includes(site) ?? false;
                return (
                  <div key={site} className={`rounded-lg border p-3 ${hasHighVariation ? "border-amber-300 bg-amber-50/50" : "border-border-neutral bg-warm-surface"}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-text-primary">
                        {tx(SITE_TEXT[site].key, SITE_TEXT[site].fallback)}
                      </label>
                      <span className="text-xs font-semibold text-brand-blue">
                        {tx("average", "Média")}: {displayNumber(average)} mm
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["first", "second", "third"] as const).map((readingName, index) => (
                        <div key={readingName}>
                          <label className="mb-1 block text-[11px] font-medium text-text-secondary" htmlFor={`skinfold-${site}-${readingName}`}>
                            {tx("reading_number", `${index + 1}ª leitura`).replace("{{number}}", String(index + 1))}
                          </label>
                          <input
                            id={`skinfold-${site}-${readingName}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.1"
                            value={reading?.[readingName] ?? ""}
                            onChange={(event) => updateReading(site, readingName, event.target.value)}
                            placeholder="mm"
                            className="w-full rounded-md border border-border-neutral bg-card-bg px-2 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                          />
                        </div>
                      ))}
                    </div>
                    {hasHighVariation && (
                      <p className="mt-2 text-xs font-medium text-amber-800">
                        {tx("variation_site_warning", "A diferença entre leituras está acima de 5%.")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {calculation?.status === "READY" && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{tx("calculation_ready", "Cálculo clínico pronto. Os valores serão recalculados no servidor ao salvar.")}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  emphasis = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${emphasis ? "border-brand-blue/20 bg-brand-blue-soft" : "border-border-neutral bg-warm-surface"}`}>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${emphasis ? "text-brand-blue" : "text-text-primary"}`}>
        {value}{suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}
