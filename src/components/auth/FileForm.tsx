"use client";
import { useActionState } from "react";
import { uploadFileAction, deleteFileAction } from "@/actions/storage";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
export function FileUploadForm({ maxBytes }: { maxBytes: number }) {
  const [state, action] = useActionState(uploadFileAction, null);
  return <form className="stack" action={action}><label className="field">Adicionar arquivo<input type="file" name="file" required /></label><small className="muted">Até {(maxBytes / 1048576).toFixed(0)} MB por arquivo. O download exige acesso ao seu espaço.</small>{state?.error && <p role="alert">{state.error}</p>}{state?.success && <p role="status">{state.success}</p>}<PendingSubmitButton className="button" pendingLabel="Enviando…">Enviar arquivo</PendingSubmitButton></form>;
}
export function FileDeleteForm({ id }: { id: string }) {
  const [state, action] = useActionState(deleteFileAction, null);
  return <form action={action}><input type="hidden" name="id" value={id} /><PendingSubmitButton className="button-secondary" pendingLabel="Excluindo…">Excluir</PendingSubmitButton>{state?.error && <small role="alert">{state.error}</small>}</form>;
}
