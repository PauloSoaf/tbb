import { Loader2 } from "lucide-react";

export function NutriOpusLoader({ label = "Carregando...", variant = "page" }: { label?: string, variant?: "page" | "inline" | "button" }) {
  if (variant === "button") {
    return (
      <span className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {label}
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 text-brand-blue py-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[50vh] text-brand-blue">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-blue/20"></div>
        <div className="w-12 h-12 rounded-full border-4 border-brand-blue border-t-transparent animate-spin absolute inset-0"></div>
      </div>
      <p className="text-sm font-semibold animate-pulse">{label}</p>
    </div>
  );
}
