"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MealPlanForm } from "@/components/meal-plans/MealPlanForm";
import { CreateMealPlanInput } from "@/validation/meal-plan.schema";
import { createMealPlanAction } from "@/actions/meal-plans.action";
import { toast } from "sonner";

interface Props {
  tenant: string;
  patientSlug: string;
  patientId: string; // real UUID, resolved server-side
}

export function NewMealPlanClient({ tenant, patientSlug, patientId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateMealPlanInput) => {
    setIsSubmitting(true);
    try {
      const result = await createMealPlanAction(tenant, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plano criado com sucesso!");
        router.push(`/dashboard/${tenant}/pacientes/${patientSlug}/planos/${result.planId}`);
      }
    } catch {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientSlug}/planos`}
          className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Novo Plano Alimentar</h1>
          <p className="text-sm text-text-secondary">Preencha as informações básicas do plano</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-neutral p-6 shadow-sm">
        <MealPlanForm
          patientId={patientId}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
