"use client";

import { useEffect, useTransition } from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(() => {
      try {
        reset();
      } catch (err) {
        toast.error("Ocorreu um erro ao tentar novamente.");
      }
    });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 mb-5">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">
          Algo deu errado
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Ocorreu um erro ao carregar esta página. Tente novamente.
        </p>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl
            text-sm font-semibold hover:bg-brand-blue-hover transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isPending ? "Carregando..." : "Tentar novamente"}
        </button>
      </div>
    </div>
  );
}
