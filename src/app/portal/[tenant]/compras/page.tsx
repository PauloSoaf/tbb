import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { prisma } from "@/lib/prisma";
import { getActiveShoppingList } from "@/services/shopping-list.service";
import {
  PatientShoppingListPage,
  type PatientShoppingList,
} from "@/components/patient-portal/shopping-list/PatientShoppingListPage";
import type { PatientShoppingItem } from "@/components/patient-portal/shopping-list/ShoppingListCategoryGroup";

interface Props {
  params: Promise<{ tenant: string }>;
}

type ShoppingListForPortal = Awaited<ReturnType<typeof getActiveShoppingList>>;

function serializeShoppingList(list: NonNullable<ShoppingListForPortal>): PatientShoppingList {
  return {
    id: list.id,
    title: list.title,
    periodDays: list.periodDays,
    createdAt: list.createdAt.toISOString(),
    generatedFromPlan: list.generatedFromPlan,
    mealPlan: list.mealPlan ? { id: list.mealPlan.id, title: list.mealPlan.title } : null,
    items: list.items.map(
      (item): PatientShoppingItem => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        householdMeasure: item.householdMeasure,
        source: item.source,
        checked: item.checked,
        notes: item.notes,
      })
    ),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("shopping_list.page_title") };
}

export default async function PortalShoppingListPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const [activePlan, activeList] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: {
        nutritionistId: session.nutritionistId,
        patientId: session.patientId,
        status: "ACTIVE",
        isTemplate: false,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    getActiveShoppingList({
      nutritionistId: session.nutritionistId,
      patientId: session.patientId,
    }),
  ]);

  return (
    <PatientShoppingListPage
      key={activeList?.id ?? "empty-shopping-list"}
      tenantSlug={tenant}
      activePlan={activePlan}
      initialList={activeList ? serializeShoppingList(activeList) : null}
    />
  );
}
