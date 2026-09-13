import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNutritionistBySlug } from "@/services/nutritionist.service";
import { PreConsultationForm } from "@/components/forms/PreConsultationForm";
import { NutriOpusIcon } from "@/components/brand/NutriOpusIcon";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PreConsultaPageProps {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: PreConsultaPageProps): Promise<Metadata> {
  const { tenant } = await params;
  const nutritionist = await getNutritionistBySlug(tenant);
  if (!nutritionist) return {};
  return { title: `Pré-consulta — ${nutritionist.name}` };
}

export default async function PreConsultaPage({
  params,
}: PreConsultaPageProps) {
  const { tenant } = await params;
  const nutritionist = await getNutritionistBySlug(tenant);

  if (!nutritionist) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-border-neutral py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href={`/${tenant}`}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/portal/${tenant}/login`}
              className="text-sm text-text-secondary hover:text-brand-blue transition-colors"
            >
              Já sou paciente →
            </Link>
            <div className="flex items-center gap-2 text-brand-blue font-bold">
              <NutriOpusIcon size={28} className="h-7 w-7 object-contain" />
              NutriOpus
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Pré-consulta
          </h1>
          <p className="text-text-secondary">
            Olá! Preencha as informações abaixo para que{" "}
            <span className="font-medium text-text-primary">
              {nutritionist.name}
            </span>{" "}
            possa se preparar para sua consulta.
          </p>
        </div>

        <PreConsultationForm tenantSlug={tenant} />
        <p className="text-center text-xs text-text-secondary mt-6">
          Ao enviar, você concorda com nossa{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-brand-blue transition-colors">
            Política de Privacidade
          </Link>
          {" "}e com o tratamento dos seus dados de saúde (LGPD).
        </p>
      </section>
    </main>
  );
}
