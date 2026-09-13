"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ImageTransformFrame, type ImageTransformPatch } from "./ImageTransformFrame";
import {
  clampEditorImageDimension,
  normalizeEditorImageAlignment,
  normalizeEditorImageLayer,
  type EditorImageAlignment,
} from "./EditorImageLayout";

const ALIGNMENT_CLASSES: Record<EditorImageAlignment, string> = {
  LEFT: "justify-start",
  CENTER: "justify-center",
  RIGHT: "justify-end",
};

function readCoordinate(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

export function EditorImageNodeView({ node, editor, getPos, selected, updateAttributes }: NodeViewProps) {
  const { t } = useI18n();
  const attrs = node.attrs as Record<string, unknown>;
  const src = typeof attrs.src === "string" ? attrs.src : "";
  const alt = typeof attrs.alt === "string" ? attrs.alt : "";
  const width = clampEditorImageDimension(attrs.width, 80, 1200, 480);
  const height = clampEditorImageDimension(attrs.height, 60, 1000, 270);
  const alignment = normalizeEditorImageAlignment(attrs.alignment);
  const layer = normalizeEditorImageLayer(attrs.layerMode);
  const x = readCoordinate(attrs.x, 24);
  const y = readCoordinate(attrs.y, 24);
  const isFloating = layer !== "INLINE";
  const storedAspectRatio = typeof attrs.aspectRatio === "number" && attrs.aspectRatio > 0
    ? attrs.aspectRatio
    : null;
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number | null>(storedAspectRatio);

  const selectImage = () => {
    const position = getPos();
    if (typeof position === "number") editor.commands.setNodeSelection(position);
  };

  const updateTransform = (patch: ImageTransformPatch) => updateAttributes(patch);

  const imageFrame = (
    <ImageTransformFrame
      width={width}
      height={height}
      x={x}
      y={y}
      minWidth={80}
      maxWidth={1200}
      minHeight={60}
      maxHeight={1000}
      aspectRatio={naturalAspectRatio}
      selected={selected}
      movable={isFloating}
      onSelect={selectImage}
      onChange={updateTransform}
      resizeLabel={t("meal_plan_clinical.editor_image.resize")}
      moveLabel={t("meal_plan_clinical.editor_image.move")}
      className="overflow-visible rounded-lg"
      style={{
        zIndex: layer === "FRONT" ? 40 : layer === "BEHIND" ? 0 : 10,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none h-full w-full rounded-lg object-contain shadow-sm"
        onLoad={(event) => {
          if (!event.currentTarget.naturalWidth || !event.currentTarget.naturalHeight) return;
          const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
          setNaturalAspectRatio(ratio);
          const patch: Record<string, number> = {};
          if (attrs.aspectRatio == null) patch.aspectRatio = ratio;
          if (attrs.height == null) {
            patch.width = width;
            patch.height = clampEditorImageDimension(width / ratio, 60, 1000, height);
          }
          if (Object.keys(patch).length > 0) updateAttributes(patch);
        }}
      />
    </ImageTransformFrame>
  );

  if (isFloating) {
    return (
      <NodeViewWrapper
        className="editor-image-node pointer-events-none absolute left-0 top-0 h-0 w-0"
        data-image-layer={layer}
        style={{ zIndex: layer === "FRONT" ? 40 : 0 }}
      >
        <div
          className="pointer-events-auto absolute"
          style={{ transform: `translate(${x}px, ${y}px)` }}
          contentEditable={false}
        >
          {imageFrame}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="editor-image-node relative z-10 my-3 w-full"
      data-image-layer="INLINE"
      data-drag-handle
    >
      <div className={`flex w-full ${ALIGNMENT_CLASSES[alignment]}`} contentEditable={false}>
        {imageFrame}
      </div>
    </NodeViewWrapper>
  );
}
