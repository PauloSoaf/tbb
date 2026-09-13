"use client";

import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, BringToFront, ChevronDown, ChevronUp, GalleryHorizontal, Ratio, SendToBack, Settings2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  MEAL_IMAGE_MAX_HEIGHT,
  MEAL_IMAGE_MAX_WIDTH,
  MEAL_IMAGE_MIN_HEIGHT,
  MEAL_IMAGE_MIN_WIDTH,
  MEAL_IMAGE_PRESETS,
  clampMealImageCoordinate,
  clampMealImageDimension,
  type MealImageAlignment,
  type MealImageFit,
  type MealImageLayer,
  type FoodImagePlacement,
} from "@/lib/meal-plan/meal-image-layout";
import { ImageTransformFrame } from "./ImageTransformFrame";

export interface MealImageEditorValue {
  url: string;
  alt: string;
  caption: string;
  showInPdf: boolean;
  width: number;
  height: number;
  fit: MealImageFit;
  alignment: MealImageAlignment;
  layer: MealImageLayer;
  x: number;
  y: number;
  placement?: FoodImagePlacement;
}

interface MealImageEditorProps {
  value: MealImageEditorValue;
  onChange: (patch: Partial<MealImageEditorValue>) => void;
  onReplace: () => void;
  onRemove: () => void;
  title?: string | null;
}

const ALIGNMENT_CLASSES: Record<MealImageAlignment, string> = {
  LEFT: "justify-start",
  CENTER: "justify-center",
  RIGHT: "justify-end",
};

export function MealImageEditor({ value, onChange, onReplace, onRemove, title }: MealImageEditorProps) {
  const { t } = useI18n();
  const floating = value.layer !== "INLINE";
  const [isEditing, setIsEditing] = useState(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    const closeWhenClickingOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || editorRef.current?.contains(event.target)) return;
      setIsEditing(false);
    };

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, [isEditing]);

  const updateWidth = (nextValue: unknown) => {
    onChange({
      width: clampMealImageDimension(nextValue, MEAL_IMAGE_MIN_WIDTH, MEAL_IMAGE_MAX_WIDTH, value.width),
    });
  };

  const updateHeight = (nextValue: unknown) => {
    onChange({
      height: clampMealImageDimension(nextValue, MEAL_IMAGE_MIN_HEIGHT, MEAL_IMAGE_MAX_HEIGHT, value.height),
    });
  };

  const preview = (
    <ImageTransformFrame
      width={value.width}
      height={value.height}
      x={value.x}
      y={value.y}
      minWidth={MEAL_IMAGE_MIN_WIDTH}
      maxWidth={MEAL_IMAGE_MAX_WIDTH}
      minHeight={MEAL_IMAGE_MIN_HEIGHT}
      maxHeight={MEAL_IMAGE_MAX_HEIGHT}
      aspectRatio={naturalAspectRatio}
      selected={isEditing}
      movable={floating}
      onSelect={() => setIsEditing(true)}
      onChange={onChange}
      resizeLabel={t("meal_plan_clinical.images.resize")}
      moveLabel={t("meal_plan_clinical.images.move")}
      className="overflow-visible rounded-xl border border-border-neutral bg-warm-surface shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={value.url}
        alt={value.alt}
        draggable={false}
        className="pointer-events-none h-full w-full rounded-xl"
        style={{ objectFit: value.fit.toLowerCase() as "cover" | "contain" }}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
            setNaturalAspectRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
          }
        }}
      />
    </ImageTransformFrame>
  );

  return (
    <div ref={editorRef} className="space-y-4">
      <div className={`flex items-center gap-3 ${title === null ? "justify-end" : "justify-between"}`}>
        {title !== null && (
          <p className="text-xs font-semibold text-text-primary">
            {title || t("meal_plan_clinical.images.meal_title")}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
              isEditing ? "bg-brand-blue/10 text-brand-blue" : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {isEditing ? t("meal_plan_clinical.images.hide_adjustments") : t("meal_plan_clinical.images.adjust")}
            {isEditing ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onReplace} className="text-xs font-semibold text-brand-blue hover:text-brand-hover">
            {t("meal_plan_clinical.images.replace")}
          </button>
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-danger hover:underline">
            {t("meal_plan_clinical.images.remove")}
          </button>
        </div>
      </div>

      {!floating && (
        <div className={`flex w-full overflow-auto p-2 ${ALIGNMENT_CLASSES[value.alignment]}`}>
          {preview}
        </div>
      )}

      {floating && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={value.url}
          alt=""
          className="hidden"
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
              setNaturalAspectRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
            }
          }}
        />
      )}

      {isEditing && (
      <div className="relative z-50 space-y-3 rounded-xl border border-border-neutral bg-card-bg p-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {t("meal_plan_clinical.images.presets")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_IMAGE_PRESETS.map((preset) => {
              const active = value.width === preset.width && value.height === preset.height;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ width: preset.width, height: preset.height })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                      : "border-border-neutral text-text-secondary hover:bg-warm-beige hover:text-text-primary"
                  }`}
                >
                  {t(preset.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.width")}</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={MEAL_IMAGE_MIN_WIDTH}
                max={MEAL_IMAGE_MAX_WIDTH}
                step={10}
                value={value.width}
                onChange={(event) => updateWidth(event.target.value)}
                className="min-w-0 flex-1 accent-brand-blue"
              />
              <input
                type="number"
                min={MEAL_IMAGE_MIN_WIDTH}
                max={MEAL_IMAGE_MAX_WIDTH}
                value={value.width}
                onChange={(event) => updateWidth(event.target.value)}
                className="h-8 w-20 rounded-lg border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </label>

          <label className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.height")}</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={MEAL_IMAGE_MIN_HEIGHT}
                max={MEAL_IMAGE_MAX_HEIGHT}
                step={10}
                value={value.height}
                onChange={(event) => updateHeight(event.target.value)}
                className="min-w-0 flex-1 accent-brand-blue"
              />
              <input
                type="number"
                min={MEAL_IMAGE_MIN_HEIGHT}
                max={MEAL_IMAGE_MAX_HEIGHT}
                value={value.height}
                onChange={(event) => updateHeight(event.target.value)}
                className="h-8 w-20 rounded-lg border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </label>
        </div>

        {value.placement && (
          <div className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.food_placement")}</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["SIDE", "placement_side"],
                ["ABOVE", "placement_above"],
                ["BELOW", "placement_below"],
              ] as const).map(([placement, label]) => (
                <button
                  key={placement}
                  type="button"
                  onClick={() => onChange({ placement })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    value.placement === placement
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                      : "border-border-neutral text-text-secondary hover:bg-warm-beige hover:text-text-primary"
                  }`}
                >
                  {t(`meal_plan_clinical.images.${label}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!naturalAspectRatio}
          onClick={() => {
            if (!naturalAspectRatio) return;
            onChange({
              height: clampMealImageDimension(
                value.width / naturalAspectRatio,
                MEAL_IMAGE_MIN_HEIGHT,
                MEAL_IMAGE_MAX_HEIGHT,
                value.height,
              ),
            });
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border-neutral px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-warm-beige hover:text-text-primary disabled:opacity-40"
        >
          <Ratio className="h-3.5 w-3.5" />
          {t("meal_plan_clinical.images.restore_ratio")}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.fit")}</span>
            <select
              value={value.fit}
              onChange={(event) => onChange({ fit: event.target.value as MealImageFit })}
              className="h-8 w-full rounded-lg border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="COVER">{t("meal_plan_clinical.images.fit_cover")}</option>
              <option value="CONTAIN">{t("meal_plan_clinical.images.fit_contain")}</option>
            </select>
          </label>

          <div className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.alignment")}</span>
            <div className="flex h-8 items-center gap-1">
              {([
                ["LEFT", AlignLeft, "align_left"],
                ["CENTER", AlignCenter, "align_center"],
                ["RIGHT", AlignRight, "align_right"],
              ] as const).map(([alignment, Icon, label]) => (
                <button
                  key={alignment}
                  type="button"
                  onClick={() => onChange({ alignment })}
                  className={`flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${
                    value.alignment === alignment
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
                  }`}
                  aria-label={t(`meal_plan_clinical.images.${label}`)}
                  title={t(`meal_plan_clinical.images.${label}`)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{t("meal_plan_clinical.images.layer")}</span>
            <div className="flex h-8 items-center gap-1">
              {([
                ["INLINE", GalleryHorizontal, "layer_inline"],
                ["BEHIND", SendToBack, "layer_behind"],
                ["FRONT", BringToFront, "layer_front"],
              ] as const).map(([layer, Icon, label]) => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => onChange({ layer })}
                  className={`flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${
                    value.layer === layer
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
                  }`}
                  aria-label={t(`meal_plan_clinical.images.${label}`)}
                  title={t(`meal_plan_clinical.images.${label}`)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {floating && (
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-text-secondary">
              <label className="space-y-1">
                <span>{t("meal_plan_clinical.images.position_x")}</span>
                <input
                  type="number"
                  min={-2000}
                  max={2000}
                  value={value.x}
                  onChange={(event) => onChange({ x: clampMealImageCoordinate(event.target.value, value.x) })}
                  className="h-8 w-full rounded-lg border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </label>
              <label className="space-y-1">
                <span>{t("meal_plan_clinical.images.position_y")}</span>
                <input
                  type="number"
                  min={-2000}
                  max={2000}
                  value={value.y}
                  onChange={(event) => onChange({ y: clampMealImageCoordinate(event.target.value, value.y) })}
                  className="h-8 w-full rounded-lg border border-border-neutral bg-card-bg px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </label>
            </div>
          )}
        </div>

        <input
          value={value.alt}
          onChange={(event) => onChange({ alt: event.target.value })}
          placeholder={t("meal_plan_clinical.images.alt_placeholder")}
          aria-label={t("meal_plan_clinical.images.alt")}
          className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <input
          value={value.caption}
          onChange={(event) => onChange({ caption: event.target.value })}
          placeholder={t("meal_plan_clinical.images.caption_placeholder")}
          aria-label={t("meal_plan_clinical.images.caption")}
          className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={value.showInPdf}
            onChange={(event) => onChange({ showInPdf: event.target.checked })}
            className="rounded border-border-neutral text-brand-blue focus:ring-brand-blue"
          />
          {t("meal_plan_clinical.images.show_in_pdf")}
        </label>
      </div>
      )}
    </div>
  );
}
