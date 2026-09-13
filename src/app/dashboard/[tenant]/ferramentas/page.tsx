import { Metadata } from "next";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { FerramentasPageClient } from "@/components/ferramentas/FerramentasPageClient";

export const metadata: Metadata = {
  title: "Ferramentas | NutriOpus",
};

interface FerramentasPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function FerramentasPage({ params }: FerramentasPageProps) {
  const { tenant } = await params;
  await assertTenantAccess(tenant);

  return <FerramentasPageClient tenant={tenant} />;
}
