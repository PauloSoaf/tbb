"use client";

import { useActionState, useCallback, useEffect, useMemo } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientMeasurementSchema, PatientMeasurementFormData } from "@/validation/patient-measurement.schema";
import { formatMeasurement } from "@/lib/utils/formatMeasurement";
import {
  calculateAssessmentSummary,
  isClinicalSkinfoldProtocol,
  normalizeAssessmentProfile,
  normalizeBiologicalSex,
  suggestAssessmentProfile,
  type AssessmentProfile,
  type BiologicalSex,
} from "@/lib/anthropometry";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ClinicalSkinfoldPanel, type ClinicalSkinfoldPanelValue } from "./ClinicalSkinfoldPanel";

type AnthropometryDefaultValues = Omit<
  Partial<PatientMeasurementFormData>,
  "assessmentProfile" | "biologicalSex" | "skinfoldProtocol" | "skinfoldMeasurements"
> & {
  assessmentProfile?: string | null;
  biologicalSex?: string | null;
  skinfoldProtocol?: string | null;
  skinfoldMeasurements?: unknown;
};

interface AnthropometryFormProps {
  action: (
    prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
  defaultValues?: AnthropometryDefaultValues;
  submitLabel?: string;
}

function defaultSkinfoldMeasurements(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function bmiToneClass(code: string | null): string {
  if (!code) return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";
  if (code.includes("NORMAL") || code.includes("EUTROPHIC")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (code.includes("UNDERWEIGHT")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (code.includes("OVERWEIGHT")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
}

export function AnthropometryForm({
  action,
  defaultValues,
  submitLabel = "Salvar avaliação",
}: AnthropometryFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const { t } = useI18n();
  const tx = (key: string, fallback: string) =>
    t(`anthropometry_clinical.${key}`, { defaultValue: fallback });

  const initialProfile = normalizeAssessmentProfile(defaultValues?.assessmentProfile);
  const initialBiologicalSex = normalizeBiologicalSex(defaultValues?.biologicalSex);
  const initialSkinfoldProtocol = isClinicalSkinfoldProtocol(defaultValues?.skinfoldProtocol)
    ? defaultValues.skinfoldProtocol
    : null;
  const initialSkinfoldMeasurements = defaultSkinfoldMeasurements(defaultValues?.skinfoldMeasurements);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    } else if (state && !state.error) {
      toast.success("Avaliação salva com sucesso!");
    }
  }, [state]);

  const methods = useForm<PatientMeasurementFormData>({
    resolver: zodResolver(patientMeasurementSchema),
    defaultValues: {
      measuredAt: defaultValues?.measuredAt || new Date().toISOString().split("T")[0],
      source: defaultValues?.source || "MANUAL",
      weight: defaultValues?.weight || null,
      height: defaultValues?.height || null,
      waist: defaultValues?.waist || null,
      hip: defaultValues?.hip || null,
      neck: defaultValues?.neck || null,
      chest: defaultValues?.chest || null,
      abdomen: defaultValues?.abdomen || null,
      relaxedArm: defaultValues?.relaxedArm || null,
      contractedArm: defaultValues?.contractedArm || null,
      forearm: defaultValues?.forearm || null,
      thigh: defaultValues?.thigh || null,
      calf: defaultValues?.calf || null,
      bodyFatPercentage: defaultValues?.bodyFatPercentage || null,
      assessmentProfile: initialProfile,
      assessmentAge: defaultValues?.assessmentAge ?? null,
      biologicalSex: initialBiologicalSex,
      waistHeightRatio: defaultValues?.waistHeightRatio ?? null,
      waistHipRisk: defaultValues?.waistHipRisk ?? null,
      waistHeightRisk: defaultValues?.waistHeightRisk ?? null,
      skinfoldProtocol: initialSkinfoldProtocol,
      skinfoldMeasurements: initialSkinfoldMeasurements,
      skinfoldSum: defaultValues?.skinfoldSum ?? null,
      skinfoldBodyDensity: defaultValues?.skinfoldBodyDensity ?? null,
      skinfoldFormula: defaultValues?.skinfoldFormula ?? null,
      notes: defaultValues?.notes || "",
    },
  });

  const { control, register, setValue, formState: { errors } } = methods;

  // Watch fields for live preview calculations
  const weight = useWatch({ control, name: "weight" });
  const height = useWatch({ control, name: "height" });
  const waist = useWatch({ control, name: "waist" });
  const hip = useWatch({ control, name: "hip" });
  const bodyFatPercentage = useWatch({ control, name: "bodyFatPercentage" });
  const assessmentProfile = (useWatch({ control, name: "assessmentProfile" }) ?? initialProfile) as AssessmentProfile;
  const biologicalSex = (useWatch({ control, name: "biologicalSex" }) ?? initialBiologicalSex) as BiologicalSex;
  const assessmentAge = useWatch({ control, name: "assessmentAge" });
  const skinfoldProtocol = useWatch({ control, name: "skinfoldProtocol" });
  const skinfoldMeasurements = useWatch({ control, name: "skinfoldMeasurements" });
  const skinfoldSum = useWatch({ control, name: "skinfoldSum" });
  const skinfoldBodyDensity = useWatch({ control, name: "skinfoldBodyDensity" });
  const skinfoldFormula = useWatch({ control, name: "skinfoldFormula" });

  const clinicalSummary = useMemo(
    () => calculateAssessmentSummary({
      profile: assessmentProfile,
      sex: biologicalSex,
      age: assessmentAge,
      weight,
      height,
      waist,
      hip,
      bodyFatPercentage,
      protocol: skinfoldProtocol,
      skinfoldMeasurements,
    }),
    [
      assessmentAge,
      assessmentProfile,
      biologicalSex,
      bodyFatPercentage,
      height,
      hip,
      skinfoldMeasurements,
      skinfoldProtocol,
      waist,
      weight,
    ]
  );

  const handleSkinfoldChange = useCallback((value: ClinicalSkinfoldPanelValue) => {
    setValue("skinfoldProtocol", value.skinfoldProtocol, { shouldDirty: true });
    setValue("skinfoldMeasurements", value.skinfoldMeasurements, { shouldDirty: true });
    setValue("skinfoldSum", value.skinfoldSum, { shouldDirty: true });
    setValue("skinfoldBodyDensity", value.skinfoldBodyDensity, { shouldDirty: true });
    setValue("skinfoldFormula", value.skinfoldFormula, { shouldDirty: true });

    if (value.bodyFatPercentage !== null) {
      setValue("bodyFatPercentage", value.bodyFatPercentage, { shouldDirty: true });
    }
  }, [setValue]);

  const bmiPreviewLabel = clinicalSummary.bmiClassification
    ?? (clinicalSummary.bmiClassificationStatus === "NOT_CLASSIFIABLE"
      ? tx("child_bmi_reference_required", "IMC por idade e sexo requer referência OMS")
      : tx("insufficient_data", "Dados insuficientes"));
  const waistHipPreviewLabel = clinicalSummary.waistHipRisk
    ?? (clinicalSummary.waistHipRiskStatus === "NOT_CLASSIFIABLE"
      ? tx("risk_not_classifiable", "Sem ponto de corte para este perfil")
      : tx("insufficient_data", "Dados insuficientes"));
  const waistHeightPreviewLabel = clinicalSummary.waistHeightRisk
    ?? (clinicalSummary.waistHeightRiskStatus === "NOT_CLASSIFIABLE"
      ? tx("risk_not_classifiable", "Sem ponto de corte para este perfil")
      : tx("insufficient_data", "Dados insuficientes"));
  const suggestedProfile = typeof assessmentAge === "number" && Number.isFinite(assessmentAge)
    ? suggestAssessmentProfile(assessmentAge)
    : null;
  const suggestedProfileLabel = suggestedProfile === "CHILD"
    ? tx("profile_child", "Criança/adolescente")
    : suggestedProfile === "ELDERLY"
      ? tx("profile_elderly", "Pessoa idosa")
      : tx("profile_adult", "Adulto");

  return (
    <FormProvider {...methods}>
      <form action={formAction} className="space-y-8">
        {/* Derived values are shown client-side for immediate feedback. The server
            independently recomputes them from the source measurements. */}
        <input type="hidden" name="waistHeightRatio" value={clinicalSummary.waistHeightRatio ?? ""} />
        <input type="hidden" name="waistHipRisk" value={clinicalSummary.waistHipRisk ?? ""} />
        <input type="hidden" name="waistHeightRisk" value={clinicalSummary.waistHeightRisk ?? ""} />
        <input type="hidden" name="skinfoldProtocol" value={skinfoldProtocol ?? ""} />
        <input type="hidden" name="skinfoldMeasurements" value={skinfoldMeasurements ?? ""} />
        <input type="hidden" name="skinfoldSum" value={skinfoldSum ?? ""} />
        <input type="hidden" name="skinfoldBodyDensity" value={skinfoldBodyDensity ?? ""} />
        <input type="hidden" name="skinfoldFormula" value={skinfoldFormula ?? ""} />
        {state?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            {state.error}
          </div>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            Por favor, corrija os erros nos campos antes de salvar.
          </div>
        )}

        {/* 1. Dados da avaliação */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">1. Dados da avaliação</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label htmlFor="measuredAt" className="block text-sm font-medium text-text-primary mb-1.5">
                Data da avaliação
              </label>
              <input
                {...register("measuredAt")}
                type="date"
                id="measuredAt"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.measuredAt && <p className="mt-1 text-xs text-red-600">{errors.measuredAt.message}</p>}
            </div>
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-text-primary mb-1.5">
                Origem dos dados
              </label>
              <select
                {...register("source")}
                id="source"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              >
                <option value="MANUAL">Manual (Fita Métrica / Balança)</option>
                <option value="BIOIMPEDANCE">Bioimpedância</option>
                <option value="SKINFOLD">Adipômetro (Dobras Cutâneas)</option>
                <option value="PHOTO_ESTIMATION">Estimativa por Foto</option>
              </select>
              {errors.source && <p className="mt-1 text-xs text-red-600">{errors.source.message}</p>}
            </div>
            <div>
              <label htmlFor="assessmentProfile" className="block text-sm font-medium text-text-primary mb-1.5">
                {tx("profile_label", "Perfil de avaliação")}
              </label>
              <select
                {...register("assessmentProfile")}
                id="assessmentProfile"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              >
                <option value="CHILD">{tx("profile_child", "Criança/adolescente")}</option>
                <option value="ADULT">{tx("profile_adult", "Adulto")}</option>
                <option value="ELDERLY">{tx("profile_elderly", "Pessoa idosa")}</option>
              </select>
              {errors.assessmentProfile && <p className="mt-1 text-xs text-red-600">{errors.assessmentProfile.message}</p>}
            </div>
            <div>
              <label htmlFor="biologicalSex" className="block text-sm font-medium text-text-primary mb-1.5">
                {tx("biological_sex_label", "Sexo biológico de referência")}
              </label>
              <select
                {...register("biologicalSex")}
                id="biologicalSex"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              >
                <option value="UNSPECIFIED">{tx("sex_unspecified", "Não informado")}</option>
                <option value="F">{tx("sex_female", "Feminino")}</option>
                <option value="M">{tx("sex_male", "Masculino")}</option>
              </select>
              {errors.biologicalSex && <p className="mt-1 text-xs text-red-600">{errors.biologicalSex.message}</p>}
            </div>
            <div>
              <label htmlFor="assessmentAge" className="block text-sm font-medium text-text-primary mb-1.5">
                {tx("assessment_age_label", "Idade na avaliação")}
              </label>
              <input
                {...register("assessmentAge", {
                  setValueAs: (value) => value === "" ? null : Number(value),
                })}
                type="number"
                min="0"
                max="130"
                step="1"
                id="assessmentAge"
                placeholder={tx("assessment_age_placeholder", "Ex.: 35")}
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.assessmentAge && <p className="mt-1 text-xs text-red-600">{errors.assessmentAge.message}</p>}
            </div>
          </div>
          {assessmentProfile === "CHILD" && (
            <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              {tx("child_profile_notice", "O IMC é exibido, mas a classificação exige a referência OMS por idade e sexo.")}
            </p>
          )}
          {suggestedProfile && suggestedProfile !== assessmentProfile && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("anthropometry_clinical.profile_suggestion", {
                profile: suggestedProfileLabel,
                defaultValue: "Pela idade informada, o perfil sugerido é {{profile}}. Você pode manter a escolha clínica atual.",
              })}
            </p>
          )}
        </section>

        {/* 2. Medidas principais */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">2. Medidas principais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-text-primary mb-1.5">
                Peso (kg) <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <input
                {...register("weight", { valueAsNumber: true })}
                type="number"
                step="0.1"
                id="weight"
                placeholder="Ex: 75.5"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.weight && <p className="mt-1 text-xs text-red-600">{errors.weight.message}</p>}
            </div>
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-text-primary mb-1.5">
                Altura (m ou cm) <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <input
                {...register("height", { valueAsNumber: true })}
                type="number"
                step="0.01"
                id="height"
                placeholder="Ex: 1.75 ou 175"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.height && <p className="mt-1 text-xs text-red-600">{errors.height.message}</p>}
            </div>
            
            {/* Preview IMC */}
            <div className="col-span-1 md:col-span-2 bg-warm-surface rounded-lg p-4 border border-border-neutral">
              <p className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Prévia IMC</p>
              {clinicalSummary.bmi !== null ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-brand-blue">{formatMeasurement(clinicalSummary.bmi, "", 1)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${bmiToneClass(clinicalSummary.bmiClassificationCode)}`}>
                    {bmiPreviewLabel}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-text-secondary">{tx("insufficient_data", "Dados insuficientes")}</span>
              )}
            </div>
          </div>
        </section>

        {/* 3. Circunferências básicas */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">3. Circunferências Básicas</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            <div>
              <label htmlFor="waist" className="block text-sm font-medium text-text-primary mb-1.5">
                Cintura (cm) <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <input
                {...register("waist", { valueAsNumber: true })}
                type="number"
                step="0.1"
                id="waist"
                placeholder="Ex: 80.5"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.waist && <p className="mt-1 text-xs text-red-600">{errors.waist.message}</p>}
            </div>
            <div>
              <label htmlFor="hip" className="block text-sm font-medium text-text-primary mb-1.5">
                Quadril (cm) <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <input
                {...register("hip", { valueAsNumber: true })}
                type="number"
                step="0.1"
                id="hip"
                placeholder="Ex: 100"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.hip && <p className="mt-1 text-xs text-red-600">{errors.hip.message}</p>}
            </div>

            {/* Preview Relação Cintura/Quadril */}
            <div className="bg-warm-surface rounded-lg p-4 border border-border-neutral">
              <p className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Rel. Cintura/Quadril</p>
              {clinicalSummary.waistHipRatio !== null ? (
                <>
                  <span className="text-2xl font-bold text-text-primary">{formatMeasurement(clinicalSummary.waistHipRatio, "", 2)}</span>
                  <p className="mt-1 text-xs font-medium text-text-secondary">{waistHipPreviewLabel}</p>
                </>
              ) : (
                <span className="text-sm text-text-secondary">{tx("insufficient_data", "Dados insuficientes")}</span>
              )}
            </div>

            <div className="bg-warm-surface rounded-lg p-4 border border-border-neutral">
              <p className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">{tx("waist_height_ratio", "Rel. Cintura/Estatura")}</p>
              {clinicalSummary.waistHeightRatio !== null ? (
                <>
                  <span className="text-2xl font-bold text-text-primary">{formatMeasurement(clinicalSummary.waistHeightRatio, "", 2)}</span>
                  <p className="mt-1 text-xs font-medium text-text-secondary">{waistHeightPreviewLabel}</p>
                </>
              ) : (
                <span className="text-sm text-text-secondary">{tx("insufficient_data", "Dados insuficientes")}</span>
              )}
            </div>
          </div>
        </section>

        {/* 4. Composição Corporal */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">4. Composição Corporal</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="bodyFatPercentage" className="block text-sm font-medium text-text-primary mb-1.5">
                % Gordura <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <input
                {...register("bodyFatPercentage", { valueAsNumber: true })}
                type="number"
                step="0.1"
                id="bodyFatPercentage"
                placeholder="Ex: 22.5"
                className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
              />
              {errors.bodyFatPercentage && <p className="mt-1 text-xs text-red-600">{errors.bodyFatPercentage.message}</p>}
            </div>

            {/* Preview Gordura kg */}
            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/40">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-300 mb-1 uppercase tracking-wide">Massa Gorda (kg)</p>
              {clinicalSummary.bodyFatKg !== null ? (
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-200">{formatMeasurement(clinicalSummary.bodyFatKg, "kg", 1)}</span>
              ) : (
                <span className="text-sm text-purple-400 dark:text-purple-400">Requer peso e % gordura</span>
              )}
            </div>

            {/* Preview Massa Magra kg */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800/40">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300 mb-1 uppercase tracking-wide">Massa Magra (kg)</p>
              {clinicalSummary.leanMassKg !== null ? (
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">{formatMeasurement(clinicalSummary.leanMassKg, "kg", 1)}</span>
              ) : (
                <span className="text-sm text-emerald-400 dark:text-emerald-400">Requer peso e % gordura</span>
              )}
            </div>
          </div>
        </section>

        <ClinicalSkinfoldPanel
          profile={assessmentProfile}
          biologicalSex={biologicalSex}
          assessmentAge={assessmentAge}
          weight={weight}
          initialProtocol={initialSkinfoldProtocol}
          initialMeasurements={initialSkinfoldMeasurements}
          onChange={handleSkinfoldChange}
        />

        {/* 5. Circunferências Complementares */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">5. Circunferências Complementares <span className="text-text-secondary font-normal text-sm">(opcional)</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label htmlFor="neck" className="block text-sm font-medium text-text-primary mb-1.5">Pescoço (cm)</label>
              <input {...register("neck", { valueAsNumber: true })} type="number" step="0.1" id="neck" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="chest" className="block text-sm font-medium text-text-primary mb-1.5">Tórax (cm)</label>
              <input {...register("chest", { valueAsNumber: true })} type="number" step="0.1" id="chest" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="abdomen" className="block text-sm font-medium text-text-primary mb-1.5">Abdômen (cm)</label>
              <input {...register("abdomen", { valueAsNumber: true })} type="number" step="0.1" id="abdomen" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="relaxedArm" className="block text-sm font-medium text-text-primary mb-1.5">Braço relaxado (cm)</label>
              <input {...register("relaxedArm", { valueAsNumber: true })} type="number" step="0.1" id="relaxedArm" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="contractedArm" className="block text-sm font-medium text-text-primary mb-1.5">Braço contraído (cm)</label>
              <input {...register("contractedArm", { valueAsNumber: true })} type="number" step="0.1" id="contractedArm" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="forearm" className="block text-sm font-medium text-text-primary mb-1.5">Antebraço (cm)</label>
              <input {...register("forearm", { valueAsNumber: true })} type="number" step="0.1" id="forearm" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="thigh" className="block text-sm font-medium text-text-primary mb-1.5">Coxa (cm)</label>
              <input {...register("thigh", { valueAsNumber: true })} type="number" step="0.1" id="thigh" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
            <div>
              <label htmlFor="calf" className="block text-sm font-medium text-text-primary mb-1.5">Panturrilha (cm)</label>
              <input {...register("calf", { valueAsNumber: true })} type="number" step="0.1" id="calf" className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors" />
            </div>
          </div>
        </section>

        {/* 6. Observações Clínicas */}
        <section className="bg-card-bg rounded-xl border border-border-neutral p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary mb-5">6. Observações</h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
              Anotações clínicas <span className="text-text-secondary font-normal">(opcional)</span>
            </label>
            <textarea
              {...register("notes")}
              id="notes"
              rows={4}
              placeholder="Descreva detalhes relevantes desta avaliação..."
              className="w-full px-3 py-2 bg-card-bg border border-border-neutral rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors resize-none"
            />
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-8 py-3 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {isPending ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
