import { PageHeader } from "@/components/ui/PageHeader";
import { PartnerAcceptActions } from "@/features/partner/PartnerAcceptActions";
import { getInvitePreview } from "@/features/partner/queries";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function PartnerAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const context = await getWorkspaceContext();
  const { token } = await params;
  const preview = await getInvitePreview(token, context.workspaceId);

  if (!preview.valid) {
    return <div className="stack">
      <PageHeader eyebrow="PARTNER" title="Convite inválido" description="Este link expirou, já foi usado ou não existe."/>
    </div>;
  }

  return <div className="stack">
    <PageHeader eyebrow="PARTNER" title={`${preview.requestedByName} quer se conectar`} description={`Ao aceitar, ${preview.requesterWorkspaceName} passa a ver os módulos que você compartilhar (Finance a princípio). Nenhum dado é copiado — cada workspace continua com seus próprios registros, e você pode desconectar quando quiser.`}/>
    <section className="panel stack">
      <PartnerAcceptActions token={token}/>
    </section>
  </div>;
}
