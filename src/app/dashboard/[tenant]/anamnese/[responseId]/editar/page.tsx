import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getAnamneseById } from "@/services/anamnese.service";
import { buildPatientSlug } from "@/lib/utils/patientSlug";
import { InternalAnamneseForm } from "@/components/forms/InternalAnamneseForm";
import type { AnamneseInput } from "@/validation/anamnese.schema";

export const metadata: Metadata = {
  title: "Editar Anamnese | NutriOpus",
};

interface EditarAnamnesePageProps {
  params: Promise<{
    tenant: string;
    responseId: string;
  }>;
}

export default async function EditarAnamnesePage({ params }: EditarAnamnesePageProps) {
  const { tenant, responseId } = await params;
  const { session } = await assertTenantAccess(tenant);
  const anamnese = await getAnamneseById(session.nutritionistId, responseId);

  if (!anamnese) {
    notFound();
  }

  const patientRouteParam = buildPatientSlug({
    id: anamnese.patient.id,
    name: anamnese.patient.name,
  });
  const payload = anamnese.payload as Partial<AnamneseInput>;
  const defaultValues: Partial<AnamneseInput> = {
    ...payload,
    name: payload.name ?? anamnese.patient.name,
    phone: payload.phone ?? anamnese.patient.phone,
    email: payload.email ?? anamnese.patient.email ?? "",
    birthDate:
      payload.birthDate ??
      (anamnese.patient.birthDate
        ? new Date(anamnese.patient.birthDate).toISOString().split("T")[0]
        : ""),
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${tenant}/anamnese/${responseId}`}
          className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para anamnese
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Editar Anamnese</h1>
        <p className="text-text-secondary mt-1">
          Atualize as respostas da anamnese de{" "}
          <span className="font-medium text-text-primary">{anamnese.patient.name}</span>.
        </p>
      </div>

      <InternalAnamneseForm
        tenantSlug={tenant}
        patientId={anamnese.patientId}
        patientRouteParam={patientRouteParam}
        responseId={responseId}
        defaultValues={defaultValues}
      />
    </div>
  );
}
