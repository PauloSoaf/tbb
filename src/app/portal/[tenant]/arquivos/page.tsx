import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.files.title", { defaultValue: "Meus Arquivos" }) };
}

export default async function ArquivosPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { patient } = await getPortalPatientAction(tenant);
  const documents = patient?.documents ?? [];

  const { t, locale } = await getServerTranslations();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-4">{t("patient_portal.files.title", { defaultValue: "Meus Arquivos" })}</h1>

      {documents.length === 0 ? (
        <div className="text-center text-text-secondary mt-8">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t("patient_portal.files.no_files", { defaultValue: "Nenhum arquivo disponível ainda." })}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-border-neutral p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand-blue shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{doc.fileName}</p>
                <p className="text-xs text-text-secondary">
                  {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: dateLocale })}
                </p>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-warm-beige text-text-secondary hover:text-brand-blue transition-colors shrink-0"
                title={t("patient_portal.files.download", { defaultValue: "Baixar arquivo" })}
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
