"use client";

import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type ImageResizeDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface ImageTransformPatch {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

interface ImageTransformFrameProps {
  children: ReactNode;
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number | null;
  selected?: boolean;
  movable?: boolean;
  onSelect?: () => void;
  onChange: (patch: ImageTransformPatch) => void;
  className?: string;
  style?: CSSProperties;
  resizeLabel: string;
  moveLabel: string;
}

interface PointerStart {
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
  x: number;
  y: number;
  direction?: ImageResizeDirection;
  mode: "MOVE" | "RESIZE";
}

const HANDLE_CLASSES: Record<ImageResizeDirection, string> = {
  N: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  NE: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  E: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  SE: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  S: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  SW: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  W: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  NW: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
};

const RESIZE_DIRECTIONS = Object.keys(HANDLE_CLASSES) as ImageResizeDirection[];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function ImageTransformFrame({
  children,
  width,
  height,
  x = 0,
  y = 0,
  minWidth = 80,
  maxWidth = 1200,
  minHeight = 60,
  maxHeight = 1000,
  aspectRatio,
  selected = false,
  movable = false,
  onSelect,
  onChange,
  className = "",
  style,
  resizeLabel,
  moveLabel,
}: ImageTransformFrameProps) {
  const pointerStartRef = useRef<PointerStart | null>(null);

  const beginPointerAction = (
    event: ReactPointerEvent<HTMLElement>,
    mode: PointerStart["mode"],
    direction?: ImageResizeDirection,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width,
      height,
      x,
      y,
      direction,
      mode,
    };
  };

  const movePointerAction = (event: ReactPointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - start.pointerX;
    const deltaY = event.clientY - start.pointerY;

    if (start.mode === "MOVE") {
      onChange({ x: Math.round(start.x + deltaX), y: Math.round(start.y + deltaY) });
      return;
    }

    const direction = start.direction;
    if (!direction) return;

    const growsRight = direction.includes("E");
    const growsLeft = direction.includes("W");
    const growsDown = direction.includes("S");
    const growsUp = direction.includes("N");
    let nextWidth = start.width;
    let nextHeight = start.height;

    if (growsRight) nextWidth = clamp(start.width + deltaX, minWidth, maxWidth);
    if (growsLeft) nextWidth = clamp(start.width - deltaX, minWidth, maxWidth);
    if (growsDown) nextHeight = clamp(start.height + deltaY, minHeight, maxHeight);
    if (growsUp) nextHeight = clamp(start.height - deltaY, minHeight, maxHeight);

    const isCorner = (growsLeft || growsRight) && (growsUp || growsDown);
    const ratio = aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : start.width / Math.max(start.height, 1);
    if (isCorner && !event.shiftKey) {
      const widthScale = nextWidth / Math.max(start.width, 1);
      const heightScale = nextHeight / Math.max(start.height, 1);
      const scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;
      nextWidth = clamp(start.width * scale, minWidth, maxWidth);
      nextHeight = clamp(nextWidth / ratio, minHeight, maxHeight);
      nextWidth = clamp(nextHeight * ratio, minWidth, maxWidth);
    }

    const patch: ImageTransformPatch = { width: nextWidth, height: nextHeight };
    if (movable && growsLeft) patch.x = Math.round(start.x + start.width - nextWidth);
    if (movable && growsUp) patch.y = Math.round(start.y + start.height - nextHeight);
    onChange(patch);
  };

  const endPointerAction = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerStartRef.current = null;
  };

  return (
    <div
      className={`group/image-transform relative touch-none select-none ${
        selected ? "outline outline-2 outline-brand-blue outline-offset-2" : ""
      } ${movable ? "cursor-move" : ""} ${className}`}
      style={{ width, height, ...style }}
      onPointerDown={movable ? (event) => beginPointerAction(event, "MOVE") : onSelect}
      onPointerMove={movable ? movePointerAction : undefined}
      onPointerUp={movable ? endPointerAction : undefined}
      onPointerCancel={movable ? endPointerAction : undefined}
      role={movable ? "button" : undefined}
      tabIndex={movable ? 0 : undefined}
      aria-label={movable ? moveLabel : undefined}
      title={movable ? moveLabel : undefined}
    >
      {children}
      {selected && (
        <>
          <span className="pointer-events-none absolute left-2 top-2 z-50 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white shadow">
            {width} × {height}px
          </span>
          {RESIZE_DIRECTIONS.map((direction) => (
            <button
              key={direction}
              type="button"
              contentEditable={false}
              data-resize-direction={direction}
              onPointerDown={(event) => beginPointerAction(event, "RESIZE", direction)}
              onPointerMove={movePointerAction}
              onPointerUp={endPointerAction}
              onPointerCancel={endPointerAction}
              className={`absolute z-[60] h-3.5 w-3.5 touch-none rounded-sm border-2 border-white bg-brand-blue shadow ${HANDLE_CLASSES[direction]}`}
              aria-label={resizeLabel}
              title={resizeLabel}
            />
          ))}
        </>
      )}
    </div>
  );
}
