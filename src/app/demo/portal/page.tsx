"use client";

import Link from "next/link";
import { CalendarDays, ListChecks, MessageCircle, ShoppingCart, TrendingUp, Utensils } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { demoRoutes } from "@/demo/demo-routes";
import { demoMealPlans, demoPatientUser } from "@/demo/demo-data";
import { DemoCard, DemoSparkline } from "@/demo/components/DemoUi";

export default function DemoPortalHomePage() {
  const { t } = useI18n();
  const { patients, appointments, goals, shoppingItems, messages } = useDemo();

  const me = patients.find((p) => p.id === demoPatientUser.patientId) ?? patients[0];
  const nextAppointment = appointments
    .filter((a) => a.patientId === me.id && a.status === "SCHEDULED")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const plan = demoMealPlans[0];
  const myGoals = goals.filter((g) => g.patientId === me.id);
  const pendingItems = shoppingItems.filter((i) => !i.bought).length;
  const lastMessage = messages.filter((m) => m.patientId === me.id).slice(-1)[0];
  const latest = me.weights[me.weights.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary">
          {t("demo.pages.portal_greeting", { name: me.name.split(" ")[0] })}
        </h1>
        <p className="text-sm text-text-secondary">{t("demo.banner.description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {nextAppointment && (
          <DemoCard title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-blue" />{t("demo.pages.next_appointment")}</span>}>
            <p className="text-lg font-black text-text-primary">{nextAppointment.date} · {nextAppointment.time}</p>
            <p className="text-sm text-text-secondary">
              {nextAppointment.title} · {nextAppointment.mode === "ONLINE" ? t("dashboard.appointments.online") : t("dashboard.appointments.in_person")}
            </p>
            <Link href={demoRoutes.portalAgenda} className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
              {t("nav.agenda")} →
            </Link>
          </DemoCard>
        )}

        <DemoCard title={<span className="flex items-center gap-2"><Utensils className="h-4 w-4 text-brand-blue" />{t("demo.pages.today_menu")}</span>}>
          <div className="space-y-1.5">
            {plan.meals.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-text-primary">{m.time} — {m.name}</span>
                <span className="text-xs text-text-secondary">{m.items.length} {t("demo.pages.items")}</span>
              </div>
            ))}
          </div>
          <Link href={demoRoutes.portalMealPlan} className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
            {t("nav.meal_plan")} →
          </Link>
        </DemoCard>

        <DemoCard title={<span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-blue" />{t("nav.progress")}</span>}>
          <DemoSparkline values={me.weights.map((w) => w.weight)} />
          <div className="mt-2 flex justify-between text-xs text-text-secondary">
            <span>{me.weights[0]?.weight.toFixed(1)} kg</span>
            <span className="font-bold text-text-primary">{latest?.weight.toFixed(1)} kg</span>
          </div>
          <div className="mt-3 space-y-2">
            {myGoals.map((g) => (
              <div key={g.id}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-text-primary">{g.title}</span>
                  <span className="font-bold text-brand-blue">{g.progress}%</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-warm">
                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DemoCard>

        <div className="space-y-6">
          <DemoCard title={<span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-blue" />{t("nav.shopping_list")}</span>}>
            <p className="text-sm text-text-secondary">
              {pendingItems} {t("demo.pages.pending_items")}
            </p>
            <Link href={demoRoutes.portalShopping} className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline">
              {t("demo.pages.open_list")} →
            </Link>
          </DemoCard>

          <DemoCard title={<span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand-blue" />{t("nav.chat")}</span>}>
            {lastMessage && <p className="truncate text-sm text-text-secondary">“{lastMessage.body}”</p>}
            <Link href={demoRoutes.portalChat} className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline">
              {t("demo.pages.open_chat")} →
            </Link>
          </DemoCard>

          <DemoCard title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-brand-blue" />{t("nav.diary")}</span>}>
            <Link href={demoRoutes.portalDiary} className="text-sm font-semibold text-brand-blue hover:underline">
              {t("demo.pages.register_meal")} →
            </Link>
          </DemoCard>
        </div>
      </div>
    </div>
  );
}
