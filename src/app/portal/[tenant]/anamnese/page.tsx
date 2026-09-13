import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minha Anamnese" };

import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function PortalAnamnesePage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { patient } = await getPortalPatientAction(tenant);
  const anamneses = patient?.anamneseResponses ?? [];

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Minhas Anamneses</h1>

      {anamneses.length === 0 ? (
        <div className="mt-8 text-center text-text-secondary">
          <p>Nenhum questionário de anamnese respondido ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anamneses.map((anamnese) => (
            <div key={anamnese.id} className="bg-white rounded-2xl border border-border-neutral p-5">
              <div className="flex items-center gap-3 mb-3 text-brand-blue">
                <ClipboardList className="w-5 h-5" />
                <h3 className="font-semibold text-text-primary">
                  Questionário respondido
                </h3>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Enviado em {format(new Date(anamnese.submittedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-text-secondary mb-2 uppercase text-xs tracking-wider">
                  Resumo da Nutricionista
                </p>
                <p className="text-text-primary">
                  {anamnese.summary || "Sua nutricionista ainda não adicionou um resumo para este questionário."}
                </p>
              </div>

              {anamnese.attentionPoints && anamnese.attentionPoints.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-text-secondary mb-2 uppercase text-xs tracking-wider">
                    Pontos de Atenção
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-primary space-y-1">
                    {anamnese.attentionPoints.map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
