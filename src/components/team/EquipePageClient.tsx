"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { TeamPanel } from "@/components/team/TeamPanel";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { TeamMemberRole } from "@prisma/client";

type Member = {
  id: string;
  email: string;
  name: string;
  role: TeamMemberRole;
  isActive: boolean;
  joinedAt: Date;
};

type Invite = {
  id: string;
  email: string;
  role: TeamMemberRole;
  status: string;
  expiresAt: Date;
};

interface EquipePageClientProps {
  tenant: string;
  members: Member[];
  invites: Invite[];
}

export function EquipePageClient({ tenant, members, invites }: EquipePageClientProps) {
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title={t("team.title")}
        subtitle={t("team.subtitle")}
      />
      <div className="max-w-3xl mx-auto p-6 mt-4">
        <TeamPanel
          tenantSlug={tenant}
          initialMembers={members}
          initialInvites={invites}
        />
      </div>
    </div>
  );
}
