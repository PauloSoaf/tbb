"use client";
import { getPatientHref } from "@/services/patient-route.service";

import React from "react";
import { FileText, Ruler, UserCircle, Video, Plus, Pencil } from "lucide-react";
import { Patient, PatientMeasurement } from "@prisma/client";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface PatientStickyHeaderProps {
  patient: Patient;
  latestMeasurement: PatientMeasurement | null;
  tenantSlug: string;
}

export function PatientStickyHeader({ patient, latestMeasurement, tenantSlug }: PatientStickyHeaderProps) {
  const getBmiBadge = (bmi?: number | null) => {
    if (!bmi) return null;
    let color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (bmi < 18.5) color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    else if (bmi >= 25) color = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        IMC {bmi.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-surface-warm/80 backdrop-blur-lg border-b border-border-neutral py-3 px-4 lg:py-4 lg:px-6 shadow-sm mb-6 lg:mb-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">

        {/* Patient Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-brand-blue/10 rounded-full flex items-center justify-center border border-brand-blue/20 shrink-0">
            <UserCircle className="w-6 h-6 lg:w-8 lg:h-8 text-brand-blue" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-bold text-text-primary leading-tight truncate">
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 text-xs lg:text-sm text-text-secondary mt-0.5 flex-wrap">
              <span className="hidden sm:inline">{patient.phone}</span>
              {latestMeasurement && latestMeasurement.weight && (
                <span>{latestMeasurement.weight}kg</span>
              )}
              {latestMeasurement && getBmiBadge(latestMeasurement.bmi)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <PendingButtonLink
            prefetch={false}
            href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "avaliacoes" })}
            pendingLabel="Abrindo..."
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg text-text-primary border border-border-neutral rounded-xl hover:border-brand-blue hover:text-brand-blue transition-colors text-xs lg:text-sm font-medium shadow-sm"
          >
            <Ruler className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Avaliacoes</span>
          </PendingButtonLink>

          <PendingButtonLink
            prefetch={false}
            href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "editar" })}
            pendingLabel="Abrindo..."
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg text-text-primary border border-border-neutral rounded-xl hover:border-brand-blue hover:text-brand-blue transition-colors text-xs lg:text-sm font-medium shadow-sm"
          >
            <Pencil className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Editar</span>
          </PendingButtonLink>

          <PendingButtonLink
            prefetch={false}
            href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "planos/novo" })}
            pendingLabel="Abrindo..."
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg text-text-primary border border-border-neutral rounded-xl hover:border-brand-blue hover:text-brand-blue transition-colors text-xs lg:text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Novo Plano</span>
          </PendingButtonLink>

          <PendingButtonLink
            prefetch={false}
            href={getPatientHref({ tenant: tenantSlug, patient: patient, suffix: "relatorio" })}
            pendingLabel="Abrindo..."
            className="flex items-center gap-1.5 px-3 py-2 bg-card-bg text-text-primary border border-border-neutral rounded-xl hover:border-brand-blue hover:text-brand-blue transition-colors text-xs lg:text-sm font-medium shadow-sm"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Relatorio</span>
          </PendingButtonLink>

          <PendingButtonLink
            prefetch={false}
            href={`/dashboard/${tenantSlug}/atendimentos/novo?patientId=${patient.id}`}
            pendingLabel="Abrindo..."
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-hover transition-colors text-xs lg:text-sm font-medium shadow-sm"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Atendimento</span>
          </PendingButtonLink>
        </div>
      </div>
    </div>
  );
}
