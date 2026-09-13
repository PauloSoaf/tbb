import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getChatMessagesAction } from "@/actions/patient-portal.action";
import { ChatClient } from "./ChatClient";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.chat.title", { defaultValue: "Chat com Nutricionista" }) };
}

export default async function ChatPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { messages = [] } = await getChatMessagesAction(tenant);
  const { t } = await getServerTranslations();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text-primary mb-4 shrink-0">
        {t("patient_portal.chat.title", { defaultValue: "Chat com a nutricionista" })}
      </h1>
      <ChatClient tenantSlug={tenant} initialMessages={messages} />
    </div>
  );
}
