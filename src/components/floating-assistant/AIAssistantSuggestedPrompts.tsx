"use client";

import { getSuggestedPrompts } from "./suggested-prompts";

export function AIAssistantSuggestedPrompts({
  onSelect,
  patientId,
}: {
  onSelect: (prompt: string) => void;
  patientId?: string | null;
}) {
  const prompts = getSuggestedPrompts(patientId);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="shrink-0 rounded-full border border-border-neutral bg-card-bg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
