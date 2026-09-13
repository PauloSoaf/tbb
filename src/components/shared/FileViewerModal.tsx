"use client";

import { useEffect } from "react";
import { X, Download, FileText, Image as ImageIcon } from "lucide-react";

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string | null;
  fileName: string;
  mimeType?: string | null;
  textContent?: string | null;
}

export function FileViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  mimeType,
  textContent,
}: FileViewerModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-neutral bg-gray-50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-brand-blue-soft text-brand-blue rounded-lg shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <h2 className="font-semibold text-text-primary truncate" title={fileName}>
              {fileName}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {fileUrl && (
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue-soft rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 flex justify-center">
          {textContent != null ? (
            <div className="w-full max-w-4xl bg-white m-4 sm:m-8 p-6 sm:p-10 shadow-sm rounded-xl overflow-y-auto font-mono text-sm whitespace-pre-wrap text-text-primary border border-border-neutral">
              {textContent}
            </div>
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          ) : isImage && fileUrl ? (
            <div className="flex items-center justify-center p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-text-primary font-medium text-lg mb-2">Visualização não suportada</p>
              <p className="text-text-secondary mb-6 max-w-md">
                Este tipo de arquivo não pode ser visualizado diretamente no navegador. Por favor, faça o download para abri-lo.
              </p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  download
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-xl font-medium hover:bg-brand-blue-hover transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Fazer Download
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
