import { getInviteByToken } from "@/services/team.service";
import { notFound } from "next/navigation";
import { AcceptInviteClient } from "./AcceptInviteClient";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = { title: "Aceitar Convite | NutriOpus" };

export default async function ConvitePage({ params }: Props) {
  const { token } = await params;
  
  const invite = await getInviteByToken(token);
  
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-warm p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-lg border border-border-neutral">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Convite Inválido</h1>
          <p className="text-text-secondary">
            Este convite pode ter expirado ou já foi utilizado. Solicite um novo link à nutricionista.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-warm p-4">
      <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-lg border border-border-neutral">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-blue">Bem-vindo(a)!</h1>
          <p className="text-text-secondary mt-2">
            Você foi convidado(a) para a clínica de <strong>{invite.nutritionist.name}</strong>.
          </p>
          <p className="text-sm text-text-secondary mt-1">E-mail: {invite.email}</p>
        </div>
        
        <AcceptInviteClient token={token} />
      </div>
    </div>
  );
}
