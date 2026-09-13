import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar no Portal" };

import { PatientLoginForm } from "./PatientLoginForm";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function PatientLoginPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (session?.nutritionistSlug === tenant) {
    redirect(`/portal/${tenant}`);
  }

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { slug: tenant },
    select: { name: true, profileImageUrl: true, crn: true },
  });
  if (!nutritionist) notFound();

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {nutritionist.profileImageUrl ? (
            <Image
              src={nutritionist.profileImageUrl}
              alt={nutritionist.name}
              width={72}
              height={72}
              className="w-18 h-18 rounded-full object-cover mx-auto mb-3 border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-brand-blue">{nutritionist.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-text-primary">{nutritionist.name}</h1>
          {nutritionist.crn && (
            <p className="text-sm text-text-secondary mt-0.5">CRN: {nutritionist.crn}</p>
          )}
          <p className="text-sm text-text-secondary mt-2">Portal do Paciente</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border-neutral p-8">
          <PatientLoginForm tenantSlug={tenant} />
        </div>
      </div>
    </div>
  );
}
