"use client";

import { ReactNode, useRef, useState } from "react";

type Position = { x: number; y: number };
type Size = { width: number; height: number };

function clampPosition(position: Position, size: Size) {
  const minVisible = 96;
  const headerVisible = 72;
  return {
    x: Math.max(8 - size.width + minVisible, Math.min(position.x, window.innerWidth - minVisible)),
    y: Math.max(8, Math.min(position.y, window.innerHeight - headerVisible)),
  };
}

export function DraggableFloatingWindow({
  title,
  icon,
  actions,
  children,
  position,
  size,
  zIndex,
  minimized,
  onMove,
  onFocus,
}: {
  title: string;
  icon?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
  position: Position;
  size: Size;
  zIndex: number;
  minimized?: boolean;
  onMove: (position: Position) => void;
  onFocus: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origin: Position } | null>(null);

  function onPointerMove(event: PointerEvent) {
    if (!dragRef.current) return;
    const next = clampPosition({
      x: dragRef.current.origin.x + event.clientX - dragRef.current.startX,
      y: dragRef.current.origin.y + event.clientY - dragRef.current.startY,
    }, size);
    onMove(next);
  }

  function stopDrag() {
    dragRef.current = null;
    setDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,textarea,select")) return;

    onFocus();
    setDragging(true);
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: position };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
  }

  return (
    <section
      className="fixed hidden overflow-hidden rounded-xl border border-border-neutral bg-card-bg shadow-2xl ring-1 ring-black/5 lg:block"
      style={{ left: position.x, top: position.y, width: size.width, zIndex }}
      onPointerDown={onFocus}
    >
      <div
        onPointerDown={startDrag}
        className={`flex select-none items-center justify-between gap-3 border-b border-border-neutral bg-card-bg/95 px-3 py-2.5 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">{icon}</div>}
          <h2 className="truncate text-sm font-bold text-text-primary">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {!minimized && (
        <div className="max-h-[min(70vh,620px)] overflow-y-auto p-3" style={{ height: size.height - 46 }}>
          {children}
        </div>
      )}
    </section>
  );
}
