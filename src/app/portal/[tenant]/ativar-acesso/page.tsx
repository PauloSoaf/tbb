import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ativar Conta" };

import { ActivationForm } from "./ActivationForm";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivateAccessPage({ params, searchParams }: Props) {
  const { tenant } = await params;
  const { token } = await searchParams;

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { slug: tenant },
    select: { name: true, profileImageUrl: true },
  });
  if (!nutritionist) notFound();

  const errorCard = (title: string, msg: string) => (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border-neutral p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-text-secondary text-sm">{msg}</p>
      </div>
    </div>
  );

  if (!token) return errorCard("Link inválido", "Este link de ativação é inválido ou expirou. Solicite um novo link à sua nutricionista.");

  const account = await prisma.patientAccount.findUnique({ where: { activationToken: token } });
  if (!account || !account.activationTokenExpiresAt || account.activationTokenExpiresAt < new Date()) {
    return errorCard("Link expirado", "Este link de ativação expirou. Solicite um novo link à sua nutricionista.");
  }

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {nutritionist.profileImageUrl ? (
            <Image src={nutritionist.profileImageUrl} alt={nutritionist.name} width={64} height={64}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-brand-blue">{nutritionist.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-text-primary">Bem-vinda ao portal!</h1>
          <p className="text-sm text-text-secondary mt-0.5">Consultório de {nutritionist.name}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border-neutral p-8">
          <div className="flex items-start gap-3 mb-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Conta encontrada!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Crie uma senha para acessar com o e-mail <strong>{account.email}</strong>.
              </p>
            </div>
          </div>
          <ActivationForm token={token} tenantSlug={tenant} />
        </div>
      </div>
    </div>
  );
}
