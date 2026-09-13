"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMealPlanSchema, CreateMealPlanInput } from "@/validation/meal-plan.schema";
import { z } from "zod";

interface MealPlanFormProps {
  patientId?: string;
  defaultValues?: Partial<CreateMealPlanInput>;
  onSubmit: (data: CreateMealPlanInput) => void;
  isSubmitting?: boolean;
}

export function MealPlanForm({ patientId, defaultValues, onSubmit, isSubmitting }: MealPlanFormProps) {

  type FormValues = z.input<typeof createMealPlanSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createMealPlanSchema),
    defaultValues: {
      patientId,
      isTemplate: !patientId,
      title: defaultValues?.title || "",
      objective: defaultValues?.objective || "",
      description: defaultValues?.description || "",
      notes: defaultValues?.notes || "",
      startDate: defaultValues?.startDate || "",
      endDate: defaultValues?.endDate || "",
    }
  });

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data as CreateMealPlanInput);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Título do Plano *
        </label>
        <input
          {...register("title")}
          className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          placeholder="Ex: Hipertrofia Fase 1"
        />
        {errors.title && <span className="text-danger text-xs mt-1">{errors.title.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Objetivo
        </label>
        <input
          {...register("objective")}
          className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          placeholder="Ex: Ganho de massa muscular"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Descrição (opcional)
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          placeholder="Orientações gerais sobre o plano..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Data de Início</label>
          <input
            type="date"
            {...register("startDate")}
            className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Data de Término</label>
          <input
            type="date"
            {...register("endDate")}
            className="w-full px-4 py-2 border border-border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Salvando..." : "Salvar Plano"}
        </button>
      </div>
    </form>
  );
}
