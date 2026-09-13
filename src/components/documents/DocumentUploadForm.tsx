"use client";

import { useState } from "react";
import { uploadDocumentAction } from "@/actions/document.action";
import { Loader2, Upload, FileUp } from "lucide-react";
import { DocumentType } from "@prisma/client";
import { toast } from "sonner";

interface DocumentUploadFormProps {
  tenantSlug: string;
  patientId: string;
}

export function DocumentUploadForm({ tenantSlug, patientId }: DocumentUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await uploadDocumentAction(tenantSlug, patientId, formData);

    if (result.error) {
      toast.error(result.error);
      setError(result.error);
    } else {
      toast.success("Arquivo enviado com sucesso!");
      (e.target as HTMLFormElement).reset();
    }

    setIsUploading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-border-neutral p-6">
      <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
        <FileUp className="w-5 h-5 text-brand-blue" />
        Novo Arquivo
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Categoria do Arquivo</label>
          <select 
            name="type" 
            required 
            className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 text-text-primary focus:border-brand-blue focus:ring-1"
          >
            <option value="EXAM">Exame</option>
            <option value="LAB_RESULT">Resultado de Laboratório</option>
            <option value="MEAL_PLAN">Plano Alimentar</option>
            <option value="ANAMNESE_PDF">Anamnese em PDF</option>
            <option value="OTHER">Outros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Selecione o arquivo (Máx 5MB)</label>
          <input 
            type="file" 
            name="file" 
            required 
            className="w-full text-sm text-text-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-brand-blue-soft file:text-brand-blue
              hover:file:bg-brand-blue/20 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-medium shadow-sm hover:bg-brand-blue-hover transition-all disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Fazer Upload
        </button>
      </form>
    </div>
  );
}
