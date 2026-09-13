"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateActivationLinkAction } from "@/actions/patient-portal.action";
import { Link2, Copy, Check } from "lucide-react";

interface Props {
  tenantSlug: string;
  patientId: string;
  patientEmail?: string | null;
}

export function PatientPortalButton({ tenantSlug, patientId, patientEmail }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!patientEmail) {
      toast.error("O paciente não tem e-mail cadastrado. Adicione um e-mail antes de gerar o link.");
      return;
    }
    setLoading(true);
    const result = await generateActivationLinkAction(tenantSlug, patientId);
    setLoading(false);
    if (result.success && result.link) {
      setLink(result.link);
      toast.success("Link gerado!");
    } else {
      toast.error(result.error || "Erro ao gerar link.");
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (link) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="text-xs border border-border-neutral rounded-lg px-3 py-2 w-64 truncate bg-gray-50"
        />
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border-neutral hover:bg-gray-50 text-text-secondary hover:text-text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
    >
      <Link2 className="w-4 h-4" />
      {loading ? "Gerando..." : "Link do Portal"}
    </button>
  );
}
