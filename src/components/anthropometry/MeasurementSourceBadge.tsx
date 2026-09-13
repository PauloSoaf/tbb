import { MeasurementSource } from "@prisma/client";

interface MeasurementSourceBadgeProps {
  source: MeasurementSource;
  className?: string;
}

const sourceMap: Record<MeasurementSource, { label: string; bg: string; text: string }> = {
  MANUAL: { label: "Manual", bg: "bg-gray-100", text: "text-gray-700" },
  BIOIMPEDANCE: { label: "Bioimpedância", bg: "bg-blue-100", text: "text-blue-700" },
  SKINFOLD: { label: "Dobras Cutâneas", bg: "bg-emerald-100", text: "text-emerald-700" },
  PHOTO_ESTIMATION: { label: "Estimativa (Foto)", bg: "bg-purple-100", text: "text-purple-700" },
};

export function MeasurementSourceBadge({ source, className = "" }: MeasurementSourceBadgeProps) {
  const config = sourceMap[source];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
