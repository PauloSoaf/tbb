import { notFound } from "next/navigation";
import { getAnamneseById } from "@/services/anamnese.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { PrintActions } from "@/components/dashboard/PrintActions";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface PrintPageProps {
  params: Promise<{ tenant: string; responseId: string }>;
}

export default async function AnamnesePrintPage({ params }: PrintPageProps) {
  const { tenant, responseId } = await params;
  const { session, nutritionist } = await assertTenantAccess(tenant);
  const { t, locale } = await getServerTranslations();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const anamnese = await getAnamneseById(session.nutritionistId, responseId);

  if (!anamnese) {
    notFound();
  }

  const payload = anamnese.payload as Record<string, string>;

  const sections = [
    {
      title: t("anamnese.personal_data"),
      fields: [
        { label: t("anamnese.name"), value: payload.name },
        { label: t("anamnese.phone"), value: payload.phone },
        { label: t("anamnese.email"), value: payload.email },
        { label: t("anamnese.birth_date"), value: payload.birthDate },
        { label: t("anamnese.weight"), value: payload.weight ? `${payload.weight} kg` : undefined },
        { label: t("anamnese.height"), value: payload.height ? `${payload.height} cm` : undefined },
      ],
    },
    {
      title: t("anamnese.main_goal"),
      fields: [{ label: t("anamnese.goal"), value: payload.goal }],
    },
    {
      title: t("anamnese.health_history"),
      fields: [
        { label: t("anamnese.diseases"), value: payload.diseases },
        { label: t("anamnese.surgeries"), value: payload.surgeries },
        { label: t("anamnese.medications"), value: payload.medications },
        { label: t("anamnese.family_history"), value: payload.familyHistory },
      ],
    },
    {
      title: t("anamnese.dietary_routine"),
      fields: [
        { label: t("anamnese.routine"), value: payload.dietaryRoutine },
        { label: t("anamnese.meal_times"), value: payload.mealTimes },
      ],
    },
    {
      title: t("anamnese.habits_symptoms"),
      fields: [
        { label: t("anamnese.sleep"), value: payload.sleepHabits },
        { label: t("anamnese.gut_health"), value: payload.gutHealth },
        { label: t("anamnese.symptoms"), value: payload.symptoms },
        { label: t("anamnese.allergies"), value: payload.allergies },
        { label: t("anamnese.intolerances"), value: payload.intolerances },
        { label: t("anamnese.dietary_restrictions"), value: payload.dietaryRestrictions },
      ],
    },
  ];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { padding: 0 !important; }
        }
        body { font-family: Georgia, serif; background: #f9f9f9; }
      `}</style>

      {/* Print actions — client component to allow window.print() */}
      <PrintActions backHref={`/dashboard/${tenant}/anamnese/${responseId}`} />

      {/* Print content */}
      <div className="print-page max-w-3xl mx-auto p-8 bg-white min-h-screen">
        {/* Header */}
        <div className="border-b-2 border-gray-200 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NutriOpus</h1>
              <p className="text-gray-500 text-sm mt-0.5">{t("anamnese.print_subtitle")}</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">{nutritionist.name}</p>
              <p>CRN: {nutritionist.crn}</p>
              {nutritionist.email && <p>{nutritionist.email}</p>}
            </div>
          </div>
        </div>

        {/* Patient + Date info */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("anamnese.print_patient_label")}</p>
            <p className="font-semibold text-gray-900">{anamnese.patient.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("anamnese.print_date_label")}</p>
            <p className="font-semibold text-gray-900">
              {format(new Date(anamnese.submittedAt), "dd 'de' MMMM 'de' yyyy", { locale: dateLocale })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t("anamnese.print_status_label")}</p>
            <p className="font-semibold text-gray-900">
              {anamnese.status === "NEW"
                ? t("anamnese.status_new")
                : anamnese.status === "REVIEWED"
                ? t("anamnese.status_reviewed")
                : t("anamnese.status_archived")}
            </p>
          </div>
        </div>

        {/* Summary */}
        {anamnese.summary && (
          <div className="mb-6 p-4 border border-blue-100 bg-blue-50 rounded-lg">
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
              {t("anamnese.print_auto_summary")}
            </h2>
            <p className="text-sm text-blue-900 leading-relaxed">{anamnese.summary}</p>
          </div>
        )}

        {/* Attention points */}
        {anamnese.attentionPoints.length > 0 && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 rounded-lg">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-2">
              {t("anamnese.attention_points_warn")}
            </h2>
            <ul className="list-disc list-inside space-y-1">
              {anamnese.attentionPoints.map((point, i) => (
                <li key={i} className="text-sm text-amber-900">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-5">
          {sections.map((section) => {
            const filled = section.fields.filter((f) => f.value && f.value.trim());
            if (filled.length === 0) return null;
            return (
              <div key={section.title}>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-1 mb-3">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {filled.map((field) => (
                    <div key={field.label} className="grid grid-cols-3 gap-2">
                      <p className="text-xs text-gray-500 pt-0.5">{field.label}</p>
                      <p className="col-span-2 text-sm text-gray-900 whitespace-pre-wrap">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Consent */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {t("anamnese.consent_agreed")}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            {t("anamnese.print_generated_by")} · {format(new Date(), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
          </p>
        </div>
      </div>
    </>
  );
}
