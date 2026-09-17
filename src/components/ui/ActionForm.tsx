"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
export type ActionResult = { error?: string; success?: string };
export function ActionForm({ action, children, className, resetOnSuccess = true }: {
  action: (data: FormData) => Promise<ActionResult>; children: ReactNode; className?: string; resetOnSuccess?: boolean;
}) {
  const [error, setError] = useState(""); const [pending, startTransition] = useTransition(); const ref = useRef<HTMLFormElement>(null);
  return <form ref={ref} className={className} action={(data) => {
    setError(""); startTransition(async () => {
      try { const result = await action(data); if (result.error) setError(result.error);
        else {
          if (result.success) toast.success(result.success);
          if (resetOnSuccess) ref.current?.reset();
          ref.current?.dispatchEvent(new CustomEvent("tbb:form-success",{bubbles:true,detail:result}));
        }
      } catch { setError("Não foi possível salvar. Tente novamente."); }
    });
  }} aria-busy={pending}><fieldset disabled={pending} className="form-contents">{children}</fieldset>
    {pending && <p role="status" className="muted text-xs">Salvando…</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </form>;
}
