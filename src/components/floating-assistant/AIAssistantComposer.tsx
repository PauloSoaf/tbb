"use client";

import { Send } from "lucide-react";
import { KeyboardEvent } from "react";

export function AIAssistantComposer({
  value,
  loading,
  onChange,
  onSubmit,
}: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="border-t border-border-neutral bg-card-bg p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border-neutral bg-background p-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={1200}
          placeholder="Pergunte sobre o sistema, paciente atual ou proxima acao..."
          className="min-h-11 flex-1 resize-none bg-transparent px-1 text-sm text-text-primary outline-none placeholder:text-text-secondary"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          aria-label="Enviar pergunta"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[11px] text-text-secondary">Enter envia · Shift Enter quebra linha.</p>
        {value.length > 900 && (
          <p className={`text-[11px] tabular-nums ${value.length >= 1150 ? "text-red-500" : "text-amber-500"}`}>
            {value.length}/1200
          </p>
        )}
      </div>
    </div>
  );
}
