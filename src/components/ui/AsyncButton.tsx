"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AsyncButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  pending?: boolean;
  pendingLabel?: ReactNode;
  spinnerClassName?: string;
};

export const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(function AsyncButton(
  {
    children,
    disabled,
    onClick,
    pending = false,
    pendingLabel,
    spinnerClassName,
    className,
    type = "button",
    ...props
  },
  ref,
) {
  const [internalPending, setInternalPending] = useState(false);
  const inFlightRef = useRef(false);
  const busy = pending || internalPending;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!onClick || busy || inFlightRef.current) return;

    inFlightRef.current = true;
    let result: void | Promise<unknown>;
    try {
      result = onClick(event);
    } catch (error) {
      inFlightRef.current = false;
      throw error;
    }
    if (!result || typeof (result as PromiseLike<unknown>).then !== "function") {
      queueMicrotask(() => {
        inFlightRef.current = false;
      });
      return;
    }

    setInternalPending(true);
    try {
      await result;
    } finally {
      inFlightRef.current = false;
      setInternalPending(false);
    }
  };

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={cn("disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      <span className="inline-grid min-w-0 place-items-center">
        <span className={cn("col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2", busy && "invisible")}>
          {children}
        </span>
        {busy && (
          <span className="col-start-1 row-start-1 inline-flex min-w-0 items-center justify-center gap-2" role="status" aria-live="polite">
            <Loader2 className={cn("h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none", spinnerClassName)} aria-hidden="true" />
            {pendingLabel === null
              ? <span className="sr-only">Carregando...</span>
              : <span>{pendingLabel ?? "Carregando..."}</span>}
          </span>
        )}
      </span>
    </button>
  );
});
