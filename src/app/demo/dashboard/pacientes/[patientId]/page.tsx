"use client";

// Demo patient record — REAL building blocks: DashboardHeader (breadcrumbs),
// PatientStickyHeader (same sticky header as the real record) and
// PatientRecordPageLayout (the real 3-column grid with the real action
// sidebar). Only the data — and the interactive note/goal widgets that would
// otherwise fire real server actions — come from the demo layer.
import { use, useState } from "react";
import { notFound } from "next/navigation";
import type { Patient, PatientMeasurement } from "@prisma/client";
import { CalendarDays, ClipboardList, FileText, Ruler, Send, Target, Utensils } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientStickyHeader } from "@/components/patients/timeline/PatientStickyHeader";
import { PatientRecordPageLayout } from "@/components/patient-record/PatientRecordPageLayout";
import { PatientClinicalAside } from "@/components/patient-record/PatientClinicalAside";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { resolveDemoPatient } from "@/demo/resolve-demo-patient";
import { demoRoutes } from "@/demo/demo-routes";
import { DemoCard, DemoSparkline } from "@/demo/components/DemoUi";

const kindIcon = {
  note: FileText,
  evaluation: Ruler,
  plan: Utensils,
  appointment: CalendarDays,
  anamnese: ClipboardList,
  file: FileText,
} as const;

export default function DemoPatientRecordPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { t } = useI18n();
  const { patients, timeline, goals, reminders, addClinicalNote, toggleReminder } = useDemo();
  const [note, setNote] = useState("");

  const patient = resolveDemoPatient(patients, patientId);
  if (!patient) notFound();

  const latest = patient.weights[patient.weights.length - 1];
  const events = timeline.filter((e) => e.patientId === patient.id);
  const patientGoals = goals.filter((g) => g.patientId === patient.id);
  const patientReminders = reminders.filter((r) => r.patientId === patient.id);

  // PatientStickyHeader only reads id/name/phone + weight/bmi — safe cast.
  const stickyPatient = {
    id: patient.id,
    name: patient.name,
    phone: patient.phone,
  } as unknown as Patient;
  const stickyMeasurement = latest
    ? ({
        weight: latest.weight,
        bmi: latest.weight / Math.pow(patient.heightCm / 100, 2),
      } as unknown as PatientMeasurement)
    : null;

  const submitNote = () => {
    if (!note.trim()) return;
    addClinicalNote(patient.id, note.trim());
    setNote("");
    toast.success(t("demo.pages.note_saved"));
  };

  const main = (
    <div className="space-y-6">
      <DemoCard title={t("demo.pages.quick_note")}>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }}
            placeholder={t("demo.pages.quick_note_placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-border-neutral bg-surface-warm px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submitNote}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
          >
            <Send className="h-4 w-4" />
            {t("demo.pages.save")}
          </button>
        </div>
      </DemoCard>

      <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary">{t("demo.pages.timeline")}</h2>
        </div>
        <div className="space-y-3">
          {events.map((e) => {
            const Icon = kindIcon[e.kind];
            return (
              <div key={e.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-bold text-text-primary">{e.title}</p>
                    <p className="text-xs text-text-secondary">{e.date}</p>
                  </div>
                  <p className="text-sm text-text-secondary">{e.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const clinicalAside = (
    <PatientClinicalAside>
      <DemoCard title={<span className="flex items-center gap-2"><Target className="h-4 w-4 text-brand-blue" />{t("patient_record.aside.goals")}</span>}>
        <div className="space-y-3">
          {patientGoals.map((g) => (
            <div key={g.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{g.title}</p>
                <span className="text-xs font-bold text-brand-blue">{g.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-warm">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${g.progress}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">{g.target}</p>
            </div>
          ))}
        </div>
      </DemoCard>

      <DemoCard title={t("patient_record.aside.reminders")}>
        <div className="space-y-2">
          {patientReminders.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-warm">
              <input
                type="checkbox"
                checked={r.done}
                onChange={() => toggleReminder(r.id)}
                className="h-4 w-4 accent-[var(--brand-blue,#2563eb)]"
              />
              <span className={`text-sm ${r.done ? "text-text-secondary line-through" : "text-text-primary"}`}>{r.title}</span>
            </label>
          ))}
        </div>
      </DemoCard>

      <DemoCard title={t("patient_record.aside.evolution")}>
        <DemoSparkline values={patient.weights.map((w) => w.weight)} />
        <div className="mt-2 flex justify-between text-xs text-text-secondary">
          <span>{patient.weights[0]?.weight.toFixed(1)} kg</span>
          <span className="font-bold text-text-primary">{latest?.weight.toFixed(1)} kg</span>
        </div>
      </DemoCard>

      {patient.clinicalAlert && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 shadow-sm border border-amber-100 dark:border-amber-800">
          <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-2">{t("demo.pages.clinical_alert")}</h3>
          <p className="text-sm text-amber-800 dark:text-amber-300">{patient.clinicalAlert}</p>
        </div>
      )}

      <DemoCard title={t("patient_record.aside.contact_info")}>
        <div className="space-y-1.5 text-sm text-text-secondary">
          <p><span className="font-semibold text-text-primary">Email:</span> {patient.email}</p>
          <p><span className="font-semibold text-text-primary">{t("demo.pages.phone")}:</span> {patient.phone}</p>
          <p><span className="font-semibold text-text-primary">{t("demo.pages.objective")}:</span> {patient.objective}</p>
        </div>
      </DemoCard>
    </PatientClinicalAside>
  );

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title="Pacientes"
        breadcrumbs={[
          { label: "Dashboard", href: demoRoutes.dashboard },
          { label: "Pacientes", href: demoRoutes.patients },
          { label: patient.name, current: true },
        ]}
        backButton={{ href: demoRoutes.patients, label: "Voltar para Pacientes" }}
      />

      <PatientStickyHeader patient={stickyPatient} latestMeasurement={stickyMeasurement} tenantSlug="demo" />

      <PatientRecordPageLayout
        tenant="demo"
        patient={{ id: patient.id, name: patient.name, email: patient.email }}
        main={main}
        clinicalAside={clinicalAside}
      />
    </div>
  );
}
