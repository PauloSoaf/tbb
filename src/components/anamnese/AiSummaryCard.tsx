"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Loader2, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface AiSummaryCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anamnesisData: any;
}

export function AiSummaryCard({ anamnesisData }: AiSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/summarize-anamnesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anamnesisData }),
      });
      const data = await response.json();
      if (response.ok) {
        setSummary(data.summary);
      } else {
        setError(data.error || t("anamnese.ai_error", { defaultValue: "Ocorreu um erro ao gerar o resumo." }));
      }
    } catch (err) {
      setError(t("anamnese.ai_network_error", { defaultValue: "Erro de rede ao conectar com a IA." }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-brand-blue/5 to-purple-500/5 border border-brand-blue/20 rounded-2xl p-6 shadow-sm mb-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-brand-blue" />
            <h3 className="text-lg font-bold text-text-primary">{t("anamnese.ai_summary_title", { defaultValue: "Análise Inteligente (IA)" })}</h3>
          </div>
          
          {!summary && !isLoading && (
            <p className="text-text-secondary text-sm">
              {t("anamnese.ai_summary_desc", { defaultValue: "Gere um resumo clínico instantâneo extraindo alertas críticos, queixas principais e sugestões de abordagem a partir das respostas do paciente." })}
            </p>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 text-brand-blue mt-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium animate-pulse">{t("anamnese.ai_analyzing", { defaultValue: "A IA está analisando a anamnese..." })}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-status-error bg-status-error/10 p-3 rounded-lg mt-4">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {summary && (
            <div className="mt-4 prose prose-sm max-w-none prose-p:text-text-secondary prose-strong:text-text-primary prose-ul:text-text-secondary prose-li:my-1 prose-headings:text-text-primary prose-headings:font-semibold bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h4 className="flex items-center gap-2 mt-4 mb-2 text-brand-blue" {...props}><FileText className="w-4 h-4"/>{props.children}</h4>,
                  h2: ({node, ...props}) => <h5 className="flex items-center gap-2 mt-4 mb-2 text-brand-blue" {...props}><FileText className="w-4 h-4"/>{props.children}</h5>,
                  ul: ({node, ...props}) => <ul className="space-y-1 mb-4" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><CheckCircle2 className="w-4 h-4 text-brand-green mt-0.5 shrink-0" /><span>{props.children}</span></li>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!summary && (
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="shrink-0 flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t("anamnese.ai_generating", { defaultValue: "Gerando..." }) : t("anamnese.ai_summarize_btn", { defaultValue: "💡 Resumir com IA" })}
          </button>
        )}
      </div>
    </div>
  );
}
