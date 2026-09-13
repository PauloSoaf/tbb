import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileBox } from "lucide-react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { listNutritionistTemplates } from "@/services/template.service";
import { TemplateManager } from "@/components/documents/TemplateManager";

export const metadata: Metadata = {
  title: "Depósito de Modelos | NutriOpus",
};

interface ModelosPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ModelosPage({ params }: ModelosPageProps) {
  const { tenant } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);

  const templates = await listNutritionistTemplates(nutritionist.id);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${tenant}/ferramentas`}
          className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Ferramentas
        </Link>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileBox className="w-6 h-6 text-brand-blue" />
          Depósito de Modelos
        </h1>
        <p className="text-text-secondary mt-1">
          Salve textos, protocolos e documentos padrão para usar com seus pacientes.
        </p>
      </div>

      <TemplateManager tenantSlug={tenant} templates={templates} />
    </div>
  );
}
