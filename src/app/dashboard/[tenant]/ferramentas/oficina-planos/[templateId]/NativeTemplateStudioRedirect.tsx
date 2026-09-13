"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { duplicateTemplateAction } from "@/actions/template.action";
import { NutriOpusLoader } from "@/components/ui/nutriopus-loader";

interface NativeTemplateStudioRedirectProps {
  tenantSlug: string;
  templateId: string;
  templateTitle: string;
}

export function NativeTemplateStudioRedirect({
  tenantSlug,
  templateId,
  templateTitle,
}: NativeTemplateStudioRedirectProps) {
  const router = useRouter();
  const requestRef = useRef<ReturnType<typeof duplicateTemplateAction> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const request = requestRef.current ?? duplicateTemplateAction(tenantSlug, templateId);
    requestRef.current = request;

    request
      .then((result) => {
        if (cancelled) return;

        if (result.error || !result.newTemplateId) {
          requestRef.current = null;
          setError(result.error ?? "Não foi possível preparar o modelo para edição.");
          return;
        }

        router.replace(
          `/dashboard/${tenantSlug}/ferramentas/oficina-planos/${result.newTemplateId}`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        requestRef.current = null;
        setError("Não foi possível preparar o modelo para edição.");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, router, templateId, tenantSlug]);

  const handleRetry = () => {
    requestRef.current = null;
    setError(null);
    setAttempt((currentAttempt) => currentAttempt + 1);
  };

  if (!error) {
    return <NutriOpusLoader label={`Preparando “${templateTitle}” no Studio...`} />;
  }

  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
          <AlertTriangle className="h-8 w-8 text-rose-500" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-text-primary">
          Não foi possível abrir o modelo
        </h1>
        <p className="mb-6 text-sm text-text-secondary">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </button>
          <Link
            href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos`}
            className="rounded-xl border border-border-neutral px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-neutral"
          >
            Voltar aos modelos
          </Link>
        </div>
      </div>
    </main>
  );
}
