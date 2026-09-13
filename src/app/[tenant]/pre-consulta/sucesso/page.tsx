import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, LogIn } from "lucide-react";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";

export const metadata: Metadata = { title: "Pré-consulta Enviada" };

interface SucessoPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SucessoPage({ params }: SucessoPageProps) {
  const { tenant } = await params;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Pré-consulta enviada!
        </h1>

        <p className="text-text-secondary mb-2 leading-relaxed">
          Suas informações foram recebidas com sucesso. A nutricionista irá
          analisar seus dados antes da consulta.
        </p>

        <p className="text-sm text-text-secondary mb-8 leading-relaxed">
          Em breve você receberá um e-mail com o link de acesso ao seu portal pessoal,
          onde poderá acompanhar seu plano alimentar e muito mais.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/portal/${tenant}/login`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl
              font-semibold hover:bg-brand-blue-hover transition-all duration-300"
          >
            <LogIn className="w-4 h-4" />
            Acessar meu portal
          </Link>
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center gap-2 px-6 py-3 border border-border-neutral text-text-secondary rounded-xl
              font-semibold hover:border-brand-blue hover:text-brand-blue transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao perfil
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-text-secondary text-sm">
          <NutriOpusIcon size={24} className="h-6 w-6 object-contain" />
          NutriOpus
        </div>
      </div>
    </main>
  );
}
