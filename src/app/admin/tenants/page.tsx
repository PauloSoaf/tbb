import React from "react";
import { globalAdminService } from "@/services/global-admin.service";
import { TenantsAdminClient } from "@/components/admin/TenantsAdminClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function GlobalAdminTenantsPage() {
  const initialData = await globalAdminService.listTenants(undefined, undefined, 1, 20);

  return (
    <>
      <AdminPageHeader titleKey="admin.tenants.title" subtitleKey="admin.tenants.description" />
      <div className="p-4 lg:p-8">
        <TenantsAdminClient initialData={initialData} />
      </div>
    </>
  );
}
