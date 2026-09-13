import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getTeamMembers, getPendingInvites } from "@/services/team.service";
import { EquipePageClient } from "@/components/team/EquipePageClient";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata() {
  return { title: "Equipe | NutriOpus" };
}

export default async function EquipePage({ params }: Props) {
  const { tenant } = await params;
  const { session } = await assertTenantAccess(tenant);
  const nutritionistId = session.nutritionistId;

  const [members, invites] = await Promise.all([
    getTeamMembers(nutritionistId),
    getPendingInvites(nutritionistId),
  ]);

  return (
    <EquipePageClient
      tenant={tenant}
      members={members}
      invites={invites}
    />
  );
}
