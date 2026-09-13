"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MealPlanForm } from "@/components/meal-plans/MealPlanForm";
import { createMealPlanAction } from "@/actions/meal-plans.action";
import { toast } from "sonner";
import { CreateMealPlanInput } from "@/validation/meal-plan.schema";

export function NewTemplateClientView({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (data: CreateMealPlanInput) => {
    startTransition(async () => {
      const result = await createMealPlanAction(tenantSlug, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Modelo criado com sucesso!");
        router.push(`/dashboard/${tenantSlug}/ferramentas/oficina-planos/${result.planId}`);
      }
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${tenantSlug}/ferramentas/oficina-planos`}
          className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Novo Modelo de Plano</h1>
          <p className="text-text-secondary mt-1">Crie um modelo vazio para adicionar as refeições.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border-neutral p-6">
        <MealPlanForm onSubmit={handleSubmit} isSubmitting={isPending} />
      </div>
    </div>
  );
}
