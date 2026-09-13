"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableMealProps {
  id: string;
  children: React.ReactNode;
}

export function SortableMeal({ id, children }: SortableMealProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? "opacity-50" : ""}`}>
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 py-4 cursor-grab hover:text-brand-blue text-border-neutral hidden md:block"
        title="Arraste para reordenar"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      {children}
    </div>
  );
}
