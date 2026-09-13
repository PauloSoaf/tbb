"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
  spinnerClassName?: string;
};

/**
 * Submit button for React/Next form actions. It must be rendered inside the
 * corresponding <form> so useFormStatus can observe that form submission.
 */
export function PendingSubmitButton({
  children,
  disabled,
  pendingLabel,
  spinnerClassName,
  className,
  type = "submit",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn("disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      <span className="inline-grid min-w-0 place-items-center">
        <span className={cn("col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2", pending && "invisible")}>
          {children}
        </span>
        {pending && (
          <span className="col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2" role="status" aria-live="polite">
            <Loader2 className={cn("h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none", spinnerClassName)} aria-hidden="true" />
            {pendingLabel === null
              ? <span className="sr-only">Salvando...</span>
              : <span>{pendingLabel ?? "Salvando..."}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
