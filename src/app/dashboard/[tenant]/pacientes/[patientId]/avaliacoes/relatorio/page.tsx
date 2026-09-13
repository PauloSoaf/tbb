import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function EvaluationReportAliasPage({ params }: Props) {
  const { tenant, patientId } = await params;
  redirect(`/dashboard/${tenant}/pacientes/${patientId}/relatorio`);
}
