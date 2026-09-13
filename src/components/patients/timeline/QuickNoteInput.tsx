"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { addPatientNoteAction } from "@/actions/patient-timeline.action";
import { toast } from "sonner";

interface QuickNoteInputProps {
  patientId: string;
}

export function QuickNoteInput({ patientId }: QuickNoteInputProps) {
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsLoading(true);
    const result = await addPatientNoteAction(patientId, note, "Nota clinica");
    setIsLoading(false);

    if (result.success) {
      toast.success("Nota clinica salva");
      setNote("");
    } else {
      toast.error(result.error || "Erro ao salvar nota clinica");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border-neutral bg-card-bg p-4 shadow-sm transition-all focus-within:border-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/10">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-text-primary">Nota clinica rapida</h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Use para observacoes pontuais, separadas do registro principal do prontuario.
        </p>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ex: lembrou de trazer exames na proxima consulta."
        className="min-h-[60px] w-full resize-none border-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none dark:text-slate-200"
        disabled={isLoading}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!note.trim() || isLoading}
          className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>Salvar nota clinica</span>
        </button>
      </div>
    </form>
  );
}
