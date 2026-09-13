import React from "react";
import { requireGlobalAdmin } from "@/lib/tenancy/requirePermission";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBackToDashboardLink } from "@/components/admin/AdminBackToDashboardLink";

export const metadata = {
  title: "Global SaaS Admin | NutriOpus",
  description: "Painel administrativo de controle de tenants, assinaturas, MRR e observabilidade do NutriOpus.",
};

export default async function GlobalAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireGlobalAdmin();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const userEmail = user?.email ?? "pauloamorim70144@gmail.com";

  const footer = (
    <AdminBackToDashboardLink
      href={`/dashboard/${session.nutritionistSlug}`}
      userEmail={userEmail}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar footer={footer} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
