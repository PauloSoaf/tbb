"use client";

import { useEffect, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function GlobalError({
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
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-50 mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Algo deu errado
        </h1>
        <p className="text-text-secondary mb-8">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
        </p>
        <button
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl
            font-semibold hover:bg-brand-blue-hover transition-all duration-300 disabled:opacity-60"
        >
          {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          {isPending ? "Carregando..." : "Tentar novamente"}
        </button>
      </div>
    </main>
  );
}
