"use client";

import { Download } from "lucide-react";

interface Props {
  patientId: string;
}

const EXPORTS = [
  { label: "Medidas", type: "measurements" },
  { label: "Dobras", type: "skinfoldsassessments" },
  { label: "Diário", type: "diary" },
  { label: "Metas", type: "goals" },
  { label: "Bem-estar", type: "wellness" },
];

export function ExportButtons({ patientId }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXPORTS.map(({ label, type }) => (
        <a
          key={type}
          href={`/api/export/csv?patientId=${patientId}&type=${type}`}
          download
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border-neutral text-text-secondary hover:bg-warm-beige transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {label}
        </a>
      ))}
    </div>
  );
}
