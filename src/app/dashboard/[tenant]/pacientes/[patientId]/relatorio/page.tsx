import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { EvolutionReport } from "@/components/reports/EvolutionReport";
import { AIPatientAnalysis } from "@/components/reports/AIPatientAnalysis";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { Smile, Zap, Moon } from "lucide-react";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export const metadata = { title: "Relatório de Evolução | NutriOpus" };

const MOOD_EMOJI = ["", "😢", "😕", "😐", "😊", "😁"];

export default async function EvolutionReportPage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const [patient, measurements, skinfoldsRaw, goals, recentCheckins] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, nutritionistId: nutritionist.id }, select: { name: true, birthDate: true } }),
    prisma.patientMeasurement.findMany({
      where: { patientId, nutritionistId: nutritionist.id },
      orderBy: { measuredAt: "desc" },
      select: { id: true, weight: true, bodyFatPercentage: true, measuredAt: true, bmi: true, waist: true },
    }),
    prisma.skinfoldAssessment.findMany({
      where: { patientId, nutritionistId: nutritionist.id },
      orderBy: { assessedAt: "desc" },
      select: { id: true, bodyFatPct: true, leanMassKg: true, assessedAt: true, protocol: true },
    }),
    prisma.patientGoal.findMany({
      where: { patientId, nutritionistId: nutritionist.id },
      select: { id: true, title: true, status: true, targetValue: true, currentValue: true, targetUnit: true, type: true },
    }),
    prisma.wellnessCheckin.findMany({
      where: { patientId, nutritionistId: nutritionist.id, date: { gte: sevenDaysAgo } },
      select: { mood: true, energy: true, sleep: true },
    }),
  ]);

  if (!patient) notFound();

  const avgMood = recentCheckins.length > 0 ? recentCheckins.reduce((s, c) => s + c.mood, 0) / recentCheckins.length : null;
  const avgEnergy = recentCheckins.length > 0 ? recentCheckins.reduce((s, c) => s + c.energy, 0) / recentCheckins.length : null;
  const avgSleep = recentCheckins.filter(c => c.sleep != null).length > 0
    ? recentCheckins.filter(c => c.sleep != null).reduce((s, c) => s + (c.sleep ?? 0), 0) / recentCheckins.filter(c => c.sleep != null).length
    : null;

  return (
    <div className="space-y-6">
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-4">
          <AppBackButton
            href={`/dashboard/${tenant}/pacientes/${patientSlug}`}
            label={`Voltar para ${patient.name}`}
          />
        </div>
        <AIPatientAnalysis patientId={patientId} />

        {/* Bem-estar da semana */}
        {recentCheckins.length > 0 && (
          <div className="mt-6 bg-white border border-border-neutral rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Bem-estar (últimos 7 dias · {recentCheckins.length} check-ins)
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {avgMood !== null && (
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Smile className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs text-text-secondary font-medium">Humor</span>
                  </div>
                  <p className="text-2xl">{MOOD_EMOJI[Math.round(avgMood)]}</p>
                  <p className="text-sm font-bold text-text-primary">{avgMood.toFixed(1)}/5</p>
                </div>
              )}
              {avgEnergy !== null && (
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-text-secondary font-medium">Energia</span>
                  </div>
                  <p className="text-2xl">{["", "🔋", "⚡", "⚡⚡", "⚡⚡⚡", "🚀"][Math.round(avgEnergy)]}</p>
                  <p className="text-sm font-bold text-text-primary">{avgEnergy.toFixed(1)}/5</p>
                </div>
              )}
              {avgSleep !== null && (
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-text-secondary font-medium">Sono</span>
                  </div>
                  <p className="text-2xl">🌙</p>
                  <p className="text-sm font-bold text-text-primary">{avgSleep.toFixed(1)}h</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <EvolutionReport
        patient={patient}
        nutritionistName={nutritionist.name}
        measurements={measurements}
        skinfoldsRaw={skinfoldsRaw.map((s) => ({ ...s, bodyFatPercentage: s.bodyFatPct }))}
        goals={goals}
        generatedAt={new Date()}
      />
    </div>
  );
}
