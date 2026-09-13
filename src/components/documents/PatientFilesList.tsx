"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileText, Eye, Activity, Utensils, Plus } from "lucide-react";
import { DocumentDeleteButton } from "./DocumentDeleteButton";
import { FileViewerModal } from "../shared/FileViewerModal";
import { Document } from "@prisma/client";

interface PatientFilesListProps {
  tenantSlug: string;
  patientId: string;
  documents: Document[];
}

export function PatientFilesList({ tenantSlug, patientId, documents }: PatientFilesListProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const exames = documents.filter(d => d.type === "EXAM" || d.type === "LAB_RESULT");
  const cardapios = documents.filter(d => d.type === "MEAL_PLAN");
  const outros = documents.filter(d => d.type === "OTHER" || d.type === "ANAMNESE_PDF");

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  const renderSection = (title: string, docs: Document[], Icon: React.ElementType, emptyText: string, categoryType: string) => (
    <div className="bg-white rounded-xl border border-border-neutral overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border-neutral flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-brand-blue" />
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        </div>
        <button
          onClick={() => {
            const select = document.querySelector('select[name="type"]') as HTMLSelectElement;
            if (select) {
              select.value = categoryType;
              select.focus();
            }
          }}
          className="p-1.5 text-text-secondary hover:text-brand-blue hover:bg-brand-blue-soft rounded-lg transition-colors"
          title="Adicionar arquivo nesta categoria"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      {docs.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-text-secondary">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-border-neutral">
          {docs.map(doc => (
            <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-brand-blue-soft text-brand-blue flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-sm text-text-primary truncate" title={doc.fileName}>
                    {doc.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                    <span>{formatSize(doc.size)}</span>
                    <span>&bull;</span>
                    <span>{format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-blue bg-brand-blue-soft hover:bg-brand-blue/20 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <a 
                  href={doc.fileUrl} 
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-text-secondary hover:text-brand-blue hover:bg-brand-blue-soft rounded-lg transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-4 h-4" />
                </a>
                <DocumentDeleteButton 
                  tenantSlug={tenantSlug}
                  patientId={patientId}
                  documentId={doc.id}
                  fileUrl={doc.fileUrl}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSection("Exames e Resultados", exames, Activity, "Nenhum exame cadastrado.", "EXAM")}
      {renderSection("Cardápios e Prescrições", cardapios, Utensils, "Nenhum cardápio cadastrado.", "MEAL_PLAN")}
      {renderSection("Outros Arquivos", outros, FileText, "Nenhum outro arquivo cadastrado.", "OTHER")}

      {selectedDoc && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          fileUrl={selectedDoc.fileUrl}
          fileName={selectedDoc.fileName}
          mimeType={selectedDoc.mimeType}
        />
      )}
    </div>
  );
}
