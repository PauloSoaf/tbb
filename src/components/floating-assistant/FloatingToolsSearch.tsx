"use client";

import { Search } from "lucide-react";

export function FloatingToolsSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border-neutral bg-card-bg px-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15">
      <Search className="h-4 w-4 text-text-secondary" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar ferramentas"
        className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
      />
    </label>
  );
}
