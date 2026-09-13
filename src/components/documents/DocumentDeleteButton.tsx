"use client";

import { useState } from "react";
import { deleteDocumentAction } from "@/actions/document.action";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface DocumentDeleteButtonProps {
  tenantSlug: string;
  patientId: string;
  documentId: string;
  fileUrl: string;
}

export function DocumentDeleteButton({
  tenantSlug,
  patientId,
  documentId,
  fileUrl,
}: DocumentDeleteButtonProps) {
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_file.title"),
      description: t("confirmations.delete_file.description"),
      confirmLabel: t("confirmations.delete_file.confirm"),
      tone: "danger",
    });
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteDocumentAction(tenantSlug, patientId, documentId, fileUrl);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Arquivo excluído com sucesso.");
      }
    } catch {
      toast.error("Ocorreu um erro ao excluir o documento.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title="Excluir arquivo"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
      {confirmDialog}
    </>
  );
}
