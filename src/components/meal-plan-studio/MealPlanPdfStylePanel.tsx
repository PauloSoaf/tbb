"use client";

import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type MealPlanImageMode,
  type MealPlanLogoPosition,
  type MealPlanLogoSize,
  type MealPlanPageNumberFormat,
  type MealPlanPageNumberPosition,
  type MealPlanPdfStyle,
  type MealPlanWatermarkPosition,
  type MealPlanWatermarkType,
} from "@/lib/meal-plan/pdf-style";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { MealPlanImageUploadError, uploadMealPlanImage } from "./meal-plan-image-upload";

interface MealPlanPdfStylePanelProps {
  planId: string;
  value: MealPlanPdfStyle;
  fallbackLogoUrl?: string | null;
  onChange: (next: MealPlanPdfStyle) => void;
  onStructuredImageDetached: (url: string) => void;
  onPreview: () => void;
  isPreviewing?: boolean;
  previewDisabled?: boolean;
}

function getErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof MealPlanImageUploadError) {
    return error.message.startsWith("meal_plan_clinical.") ? t(error.message) : error.message;
  }
  return t("meal_plan_clinical.images.upload_error");
}

export function MealPlanPdfStylePanel({ planId, value, fallbackLogoUrl, onChange, onStructuredImageDetached, onPreview, isPreviewing = false, previewDisabled = false }: MealPlanPdfStylePanelProps) {
  const { t } = useI18n();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "watermark" | null>(null);
  const activeLogoUrl = value.logoUrl ?? fallbackLogoUrl ?? null;

  const update = <Key extends keyof MealPlanPdfStyle>(key: Key, next: MealPlanPdfStyle[Key]) => {
    onChange({ ...value, [key]: next });
  };

  const uploadStyleImage = async (file: File, target: "logo" | "watermark") => {
    setUploading(target);
    try {
      const uploaded = await uploadMealPlanImage({ file, planId, kind: "LOGO" });
      if (target === "logo") {
        if (value.logoUrl && value.logoUrl !== uploaded.url) onStructuredImageDetached(value.logoUrl);
        onChange({ ...value, logoUrl: uploaded.url, showLogo: true });
      } else {
        if (value.watermarkImageUrl && value.watermarkImageUrl !== uploaded.url) onStructuredImageDetached(value.watermarkImageUrl);
        onChange({ ...value, watermarkImageUrl: uploaded.url, watermarkType: "IMAGE", watermarkEnabled: true });
      }
      toast.success(t("meal_plan_clinical.images.upload_success"));
    } catch (error) {
      toast.error(getErrorMessage(error, t));
    } finally {
      setUploading(null);
      const input = target === "logo" ? logoInputRef.current : watermarkInputRef.current;
      if (input) input.value = "";
    }
  };

  return (
    <section className="border-t border-border-neutral pt-4 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-text-primary">{t("meal_plan_clinical.pdf_style.title")}</h3>
        <p className="mt-1 text-xs text-text-secondary">{t("meal_plan_clinical.pdf_style.description")}</p>
        <AsyncButton type="button" onClick={onPreview} pending={isPreviewing} pendingLabel="Abrindo..." disabled={previewDisabled} className="mt-3 inline-flex items-center rounded-lg border border-brand-blue px-2.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50">
          {t("meal_plan_clinical.pdf_style.preview")}
        </AsyncButton>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-text-secondary">{t("meal_plan_clinical.pdf_style.logo")}</legend>
        <input
          ref={logoInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadStyleImage(file, "logo");
          }}
        />
        <div className="flex items-center gap-3">
          {activeLogoUrl ? (
            <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-border-neutral bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeLogoUrl} alt={t("meal_plan_clinical.pdf_style.logo_preview_alt")} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-dashed border-border-neutral text-text-secondary">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading === "logo"} className="inline-flex items-center gap-1.5 rounded-lg border border-border-neutral px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-neutral disabled:opacity-50">
              {uploading === "logo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {value.logoUrl ? t("meal_plan_clinical.images.replace") : t("meal_plan_clinical.pdf_style.upload_logo")}
            </button>
            {value.logoUrl && (
              <button type="button" onClick={() => { onStructuredImageDetached(value.logoUrl!); onChange({ ...value, logoUrl: null, showLogo: Boolean(fallbackLogoUrl) }); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-danger hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" />
                {t("meal_plan_clinical.images.remove")}
              </button>
            )}
          </div>
        </div>
        {!value.logoUrl && fallbackLogoUrl && <p className="text-[11px] text-text-secondary">{t("meal_plan_clinical.pdf_style.profile_logo_hint")}</p>}
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={value.showLogo} onChange={(event) => update("showLogo", event.target.checked)} disabled={!activeLogoUrl} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />
          {t("meal_plan_clinical.pdf_style.show_logo")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <SelectField<MealPlanLogoPosition> label={t("meal_plan_clinical.pdf_style.logo_position")} value={value.logoPosition} onChange={(next) => update("logoPosition", next)} options={[
            ["LEFT", t("meal_plan_clinical.pdf_style.position_left")],
            ["CENTER", t("meal_plan_clinical.pdf_style.position_center")],
            ["RIGHT", t("meal_plan_clinical.pdf_style.position_right")],
          ]} />
          <SelectField<MealPlanLogoSize> label={t("meal_plan_clinical.pdf_style.logo_size")} value={value.logoSize} onChange={(next) => update("logoSize", next)} options={[
            ["SM", t("meal_plan_clinical.pdf_style.size_small")],
            ["MD", t("meal_plan_clinical.pdf_style.size_medium")],
            ["LG", t("meal_plan_clinical.pdf_style.size_large")],
          ]} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-text-secondary">{t("meal_plan_clinical.pdf_style.watermark")}</legend>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={value.watermarkEnabled} onChange={(event) => update("watermarkEnabled", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />
          {t("meal_plan_clinical.pdf_style.enable_watermark")}
        </label>
        {value.watermarkEnabled && (
          <>
            <SelectField<MealPlanWatermarkType> label={t("meal_plan_clinical.pdf_style.watermark_type")} value={value.watermarkType} onChange={(next) => update("watermarkType", next)} options={[
              ["TEXT", t("meal_plan_clinical.pdf_style.watermark_text")],
              ["IMAGE", t("meal_plan_clinical.pdf_style.watermark_image")],
            ]} />
            {value.watermarkType === "TEXT" ? (
              <input value={value.watermarkText ?? ""} onChange={(event) => update("watermarkText", event.target.value || null)} placeholder={t("meal_plan_clinical.pdf_style.watermark_text_placeholder")} aria-label={t("meal_plan_clinical.pdf_style.watermark_text")} className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            ) : (
              <>
                <input ref={watermarkInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStyleImage(file, "watermark"); }} />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => watermarkInputRef.current?.click()} disabled={uploading === "watermark"} className="inline-flex items-center gap-1.5 rounded-lg border border-border-neutral px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-neutral disabled:opacity-50">
                    {uploading === "watermark" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    {value.watermarkImageUrl ? t("meal_plan_clinical.images.replace") : t("meal_plan_clinical.pdf_style.upload_watermark")}
                  </button>
                  {value.watermarkImageUrl && <button type="button" onClick={() => { onStructuredImageDetached(value.watermarkImageUrl!); update("watermarkImageUrl", null); }} className="text-xs font-semibold text-danger hover:underline">{t("meal_plan_clinical.images.remove")}</button>}
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SelectField<MealPlanWatermarkPosition> label={t("meal_plan_clinical.pdf_style.watermark_position")} value={value.watermarkPosition} onChange={(next) => update("watermarkPosition", next)} options={[
                ["CENTER", t("meal_plan_clinical.pdf_style.position_center")],
                ["DIAGONAL", t("meal_plan_clinical.pdf_style.position_diagonal")],
                ["FOOTER", t("meal_plan_clinical.pdf_style.position_footer")],
                ["CORNER", t("meal_plan_clinical.pdf_style.position_corner")],
              ]} />
              <label className="text-xs text-text-secondary">
                <span className="mb-1 block">{t("meal_plan_clinical.pdf_style.opacity")}</span>
                <input type="range" min="0.02" max="1" step="0.01" value={value.watermarkOpacity} onChange={(event) => update("watermarkOpacity", Number(event.target.value))} className="w-full accent-brand-blue" />
                <span className="block text-right text-[11px]">{Math.round(value.watermarkOpacity * 100)}%</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={value.watermarkRepeat} onChange={(event) => update("watermarkRepeat", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />
              {t("meal_plan_clinical.pdf_style.watermark_repeat")}
            </label>
          </>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-text-secondary">{t("meal_plan_clinical.pdf_style.pagination")}</legend>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={value.pageNumbers} onChange={(event) => update("pageNumbers", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />
          {t("meal_plan_clinical.pdf_style.show_page_numbers")}
        </label>
        {value.pageNumbers && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SelectField<MealPlanPageNumberPosition> label={t("meal_plan_clinical.pdf_style.page_number_position")} value={value.pageNumberPosition} onChange={(next) => update("pageNumberPosition", next)} options={[
                ["LEFT", t("meal_plan_clinical.pdf_style.position_left")],
                ["CENTER", t("meal_plan_clinical.pdf_style.position_center")],
                ["RIGHT", t("meal_plan_clinical.pdf_style.position_right")],
              ]} />
              <SelectField<MealPlanPageNumberFormat> label={t("meal_plan_clinical.pdf_style.page_number_format")} value={value.pageNumberFormat} onChange={(next) => update("pageNumberFormat", next)} options={[
                ["PAGE_OF_TOTAL", t("meal_plan_clinical.pdf_style.page_of_total")],
                ["FRACTION", t("meal_plan_clinical.pdf_style.page_fraction")],
              ]} />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={value.showFirstPage} onChange={(event) => update("showFirstPage", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />{t("meal_plan_clinical.pdf_style.show_first_page")}</label>
          </>
        )}
        <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={value.includeDate} onChange={(event) => update("includeDate", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />{t("meal_plan_clinical.pdf_style.include_date")}</label>
        <label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={value.includePatientName} onChange={(event) => update("includePatientName", event.target.checked)} className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue" />{t("meal_plan_clinical.pdf_style.include_patient_name")}</label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-wide text-text-secondary">{t("meal_plan_clinical.pdf_style.images")}</legend>
        <SelectField<MealPlanImageMode> label={t("meal_plan_clinical.pdf_style.image_mode")} value={value.imageMode} onChange={(next) => update("imageMode", next)} options={[
          ["ALL", t("meal_plan_clinical.pdf_style.images_all")],
          ["MEALS", t("meal_plan_clinical.pdf_style.images_meals")],
          ["NONE", t("meal_plan_clinical.pdf_style.images_none")],
        ]} />
      </fieldset>
    </section>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: readonly (readonly [T, string])[] }) {
  return (
    <label className="block text-xs text-text-secondary">
      <span className="mb-1 block">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="w-full rounded-lg border border-border-neutral bg-card-bg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
