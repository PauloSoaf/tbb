import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calculadora Nutricional" };

import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { Calculator } from "lucide-react";
import { redirect } from "next/navigation";
import { CalculatorClient } from "./CalculatorClient";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function PortalCalculatorPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();

  if (!session || session.nutritionistSlug !== tenant) {
    redirect(`/portal/${tenant}/login`);
  }

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Calculadora TACO</h1>
            <p className="text-sm text-text-secondary">
              Consulte calorias e macros dos alimentos da base brasileira.
            </p>
          </div>
        </div>
      </header>

      <CalculatorClient />
    </div>
  );
}
