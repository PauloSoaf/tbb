"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  patientId: string;
}

export function AIPatientAnalysis({ patientId }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-border-neutral rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-text-primary text-sm">Análise por IA</h3>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-60 font-medium"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analisando..." : "Gerar análise"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {analysis && (
        <div
          className="prose prose-sm max-w-none text-text-secondary"
          dangerouslySetInnerHTML={{
            __html: analysis
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.*?)\*/g, "<em>$1</em>")
              .replace(/^- /gm, "• ")
              .replace(/\n/g, "<br/>"),
          }}
        />
      )}

      {!analysis && !loading && (
        <p className="text-xs text-text-secondary">
          Clique em &quot;Gerar análise&quot; para obter um resumo inteligente do progresso do paciente.
        </p>
      )}
    </div>
  );
}
