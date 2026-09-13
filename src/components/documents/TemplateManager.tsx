"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, FileText, Type, Download, Eye, Loader2, Trash2 } from "lucide-react";
import { Template } from "@prisma/client";
import { FileViewerModal } from "../shared/FileViewerModal";
import { createTextTemplateAction, uploadFileTemplateAction, deleteTemplateAction } from "@/actions/template.action";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface TemplateManagerProps {
  tenantSlug: string;
  templates: Template[];
}

export function TemplateManager({ tenantSlug, templates }: TemplateManagerProps) {
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<"LIST" | "NEW_TEXT" | "NEW_FILE">("LIST");
  
  // States for text form
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isSubmittingText, setIsSubmittingText] = useState(false);

  // States for file form
  const [fileTitle, setFileTitle] = useState("");
  const [fileError, setFileError] = useState("");
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  async function handleCreateText(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingText(true);
    const result = await createTextTemplateAction(tenantSlug, textTitle, textContent);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Modelo de texto salvo com sucesso!");
      setTextTitle("");
      setTextContent("");
      setActiveTab("LIST");
    }
    setIsSubmittingText(false);
  }

  async function handleUploadFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmittingFile(true);
    setFileError("");

    const formData = new FormData(e.currentTarget);
    const result = await uploadFileTemplateAction(tenantSlug, formData);

    if (result.error) {
      toast.error(result.error);
      setFileError(result.error);
    } else {
      toast.success("Upload concluído com sucesso!");
      setFileTitle("");
      (e.target as HTMLFormElement).reset();
      setActiveTab("LIST");
    }
    setIsSubmittingFile(false);
  }

  async function handleDelete(id: string, fileUrl: string | null) {
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_template.title"),
      description: t("confirmations.delete_template.description"),
      confirmLabel: t("confirmations.delete_template.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;
    setDeletingId(id);
    const result = await deleteTemplateAction(tenantSlug, id, fileUrl);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Modelo excluído com sucesso.");
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border-neutral">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelos..." 
            className="bg-gray-50 border border-border-neutral rounded-lg pl-9 pr-4 py-2 outline-none w-full text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-brand-blue"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab("NEW_TEXT")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm
              ${activeTab === "NEW_TEXT" ? "bg-brand-blue text-white" : "bg-white border border-border-neutral text-text-primary hover:bg-gray-50"}`}
          >
            <Type className="w-4 h-4" />
            Novo Texto
          </button>
          <button 
            onClick={() => setActiveTab("NEW_FILE")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm
              ${activeTab === "NEW_FILE" ? "bg-brand-blue text-white" : "bg-white border border-border-neutral text-text-primary hover:bg-gray-50"}`}
          >
            <Plus className="w-4 h-4" />
            Upload Arquivo
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === "LIST" && (
        <div className="bg-white rounded-xl border border-border-neutral overflow-hidden shadow-sm">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-text-primary font-medium">Nenhum modelo encontrado.</p>
              <p className="text-sm text-text-secondary mt-1">Crie textos ou faça upload de arquivos em PDF/Word.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-neutral">
              {filteredTemplates.map(template => (
                <div key={template.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      ${template.type === "TEXT" ? "bg-amber-50 text-amber-600" : "bg-brand-blue-soft text-brand-blue"}`}>
                      {template.type === "TEXT" ? <Type className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="truncate">
                      <h3 className="font-medium text-sm text-text-primary truncate">{template.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                        <span className="font-semibold">{template.type === "TEXT" ? "Texto" : "Arquivo"}</span>
                        <span>&bull;</span>
                        <span>{format(new Date(template.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => setSelectedTemplate(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue-soft rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </button>
                    {template.fileUrl && (
                      <a 
                        href={template.fileUrl} 
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-text-secondary hover:text-brand-blue hover:bg-brand-blue-soft rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => handleDelete(template.id, template.fileUrl)}
                      disabled={deletingId === template.id}
                      className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "NEW_TEXT" && (
        <div className="bg-white rounded-xl border border-border-neutral p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-amber-600" />
            Novo Modelo de Texto / Markdown
          </h2>
          <form onSubmit={handleCreateText} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Título do Modelo</label>
              <input 
                type="text" 
                required
                value={textTitle}
                onChange={e => setTextTitle(e.target.value)}
                placeholder="Ex: Orientações para Jejum"
                className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 focus:border-brand-blue focus:ring-1 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Conteúdo</label>
              <textarea 
                required
                rows={12}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder="Escreva seu texto aqui. Você pode usar formatação markdown."
                className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 focus:border-brand-blue focus:ring-1 outline-none resize-y font-mono text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setActiveTab("LIST")}
                className="px-4 py-2 font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmittingText}
                className="flex items-center gap-2 px-6 py-2 bg-brand-blue text-white rounded-lg font-medium shadow-sm hover:bg-brand-blue-hover transition-all disabled:opacity-50"
              >
                {isSubmittingText ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Texto"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "NEW_FILE" && (
        <div className="bg-white rounded-xl border border-border-neutral p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-blue" />
            Upload de Arquivo (PDF, Imagens)
          </h2>
          <form onSubmit={handleUploadFile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Título do Modelo</label>
              <input 
                type="text" 
                name="title"
                required
                value={fileTitle}
                onChange={e => setFileTitle(e.target.value)}
                placeholder="Ex: PDF Dieta Hipertrofia Básica"
                className="w-full px-3 py-2 rounded-lg border border-border-neutral bg-gray-50 focus:border-brand-blue focus:ring-1 outline-none"
              />
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
            
            {fileError && (
              <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg">{fileError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setActiveTab("LIST")}
                className="px-4 py-2 font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmittingFile}
                className="flex items-center gap-2 px-6 py-2 bg-brand-blue text-white rounded-lg font-medium shadow-sm hover:bg-brand-blue-hover transition-all disabled:opacity-50"
              >
                {isSubmittingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fazer Upload"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTemplate && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          fileUrl={selectedTemplate.fileUrl}
          fileName={selectedTemplate.fileName || selectedTemplate.title}
          mimeType={selectedTemplate.mimeType}
          textContent={selectedTemplate.content}
        />
      )}
      {confirmDialog}
    </div>
  );
}
