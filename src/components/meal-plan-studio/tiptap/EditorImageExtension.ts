import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EditorImageNodeView } from "./EditorImageNodeView";
import {
  normalizeEditorImageAlignment,
  normalizeEditorImageLayer,
} from "./EditorImageLayout";

export type { EditorImageAlignment, EditorImageLayer } from "./EditorImageLayout";

const alignmentStyles = {
  LEFT: "display: block; margin-left: 0; margin-right: auto;",
  CENTER: "display: block; margin-left: auto; margin-right: auto;",
  RIGHT: "display: block; margin-left: auto; margin-right: 0;",
} as const;

function readCoordinate(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

/**
 * Free editor image with persistent dimensions, canvas position and stacking.
 * The React NodeView supplies the Docs-like selection border and eight handles.
 */
export const EditorImageExtension = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => {
          const parsed = Number(element.getAttribute("data-aspect-ratio"));
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
        renderHTML: (attributes) => attributes.aspectRatio
          ? { "data-aspect-ratio": attributes.aspectRatio }
          : {},
      },
      alignment: {
        default: "CENTER",
        parseHTML: (element) => normalizeEditorImageAlignment(element.getAttribute("data-align")),
        renderHTML: (attributes) => ({ "data-align": normalizeEditorImageAlignment(attributes.alignment) }),
      },
      layerMode: {
        default: "INLINE",
        parseHTML: (element) => normalizeEditorImageLayer(element.getAttribute("data-image-layer")),
        renderHTML: (attributes) => ({ "data-image-layer": normalizeEditorImageLayer(attributes.layerMode) }),
      },
      x: {
        default: 24,
        parseHTML: (element) => readCoordinate(element.getAttribute("data-image-x"), 24),
        renderHTML: (attributes) => ({ "data-image-x": readCoordinate(attributes.x, 24) }),
      },
      y: {
        default: 24,
        parseHTML: (element) => readCoordinate(element.getAttribute("data-image-y"), 24),
        renderHTML: (attributes) => ({ "data-image-y": readCoordinate(attributes.y, 24) }),
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const alignment = normalizeEditorImageAlignment(node.attrs.alignment);
    const layer = normalizeEditorImageLayer(node.attrs.layerMode);
    const x = readCoordinate(node.attrs.x, 24);
    const y = readCoordinate(node.attrs.y, 24);
    const layerStyle = layer === "INLINE"
      ? alignmentStyles[alignment]
      : `position: absolute; left: ${x}px; top: ${y}px; z-index: ${layer === "FRONT" ? 40 : 0};`;

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-align": alignment,
        "data-image-layer": layer,
        "data-image-x": x,
        "data-image-y": y,
        style: layerStyle,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorImageNodeView);
  },
}).configure({
  HTMLAttributes: {
    class: "my-3 max-w-full rounded-lg",
  },
  resize: false,
});
