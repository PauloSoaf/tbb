import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { listPatientDocuments } from "@/services/document.service";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { PatientFilesList } from "@/components/documents/PatientFilesList";

export const metadata: Metadata = {
  title: "Arquivos do Paciente | NutriOpus",
};

interface PatientFilesPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
  }>;
}

export default async function PatientFilesPage({ params }: PatientFilesPageProps) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const patient = await getPatientById(nutritionist.id, patientId);
  if (!patient) {
    notFound();
  }

  const documents = await listPatientDocuments(nutritionist.id, patientId);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientSlug}`}
          className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para paciente
        </Link>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          Arquivos de {patient.name}
        </h1>
        <p className="text-text-secondary mt-1">
          Gerencie exames, planos alimentares e outros documentos com visualização integrada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <PatientFilesList 
            tenantSlug={tenant} 
            patientId={patientId} 
            documents={documents} 
          />
        </div>

        <div className="lg:col-span-1 sticky top-6">
          <DocumentUploadForm tenantSlug={tenant} patientId={patientId} />
        </div>
      </div>
    </div>
  );
}
