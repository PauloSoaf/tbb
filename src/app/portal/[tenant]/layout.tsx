import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { PatientPortalShell } from "@/components/patient-portal/layout/PatientPortalShell";
import { prisma } from "@/lib/prisma";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { buildPatientPortalSlug } from "@/lib/utils/patientPortalRoute";

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function PortalLayout({ children, params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();

  if (!session || session.nutritionistSlug !== tenant) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const [patient, nutritionist] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: session.patientId, nutritionistId: session.nutritionistId },
      select: { id: true, name: true },
    }),
    prisma.nutritionist.findUnique({
      where: { slug: tenant },
      select: { whatsapp: true },
    }),
  ]);

  const { t } = await getServerTranslations();
  const patientName = patient?.name ?? t("patient_portal.nav.patient_default", { defaultValue: "Paciente" });
  const patientSlug = patient ? buildPatientPortalSlug(patient) : "paciente";
  const nutritionistWhatsApp = nutritionist?.whatsapp ?? null;

  return (
    <PatientPortalShell
      tenantSlug={tenant}
      patientName={patientName}
      patientSlug={patientSlug}
      nutritionistWhatsApp={nutritionistWhatsApp}
    >
      {children}
    </PatientPortalShell>
  );
}
