"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, Mail, Shield, ChevronDown, Loader2 } from "lucide-react";
import { inviteTeamMemberAction, revokeInviteAction, updateMemberRoleAction, removeMemberAction } from "@/actions/team.action";
import type { TeamMemberRole } from "@prisma/client";
import { useI18n } from "@/lib/i18n/I18nContext";
import { MemberPermissionsModal } from "./MemberPermissionsModal";
import { Can } from "@/lib/tenancy/PermissionsContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

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

interface Props {
  tenantSlug: string;
  initialMembers: Member[];
  initialInvites: Invite[];
}

const ROLE_COLOR: Record<TeamMemberRole, string> = {
  OWNER: "bg-purple-100 text-purple-700 font-semibold",
  ADMIN: "bg-red-100 text-red-700",
  NUTRITIONIST: "bg-emerald-100 text-emerald-700",
  EDITOR: "bg-blue-100 text-blue-700",
  ASSISTANT: "bg-amber-100 text-amber-700",
  SECRETARY: "bg-cyan-100 text-cyan-700",
  VIEWER: "bg-gray-100 text-gray-600",
  CUSTOM: "bg-indigo-100 text-indigo-700",
};

export function TeamPanel({ tenantSlug, initialMembers, initialInvites }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("VIEWER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  
  const { t } = useI18n();

  const ROLE_LABEL: Record<TeamMemberRole, string> = {
    OWNER: t("team.roles.owner", { defaultValue: "Dono" }),
    ADMIN: t("team.roles.admin", { defaultValue: "Admin" }),
    NUTRITIONIST: t("team.roles.nutritionist", { defaultValue: "Nutricionista" }),
    EDITOR: t("team.roles.editor", { defaultValue: "Editor" }),
    ASSISTANT: t("team.roles.assistant", { defaultValue: "Assistente" }),
    SECRETARY: t("team.roles.secretary", { defaultValue: "Secretaria(o)" }),
    VIEWER: t("team.roles.viewer", { defaultValue: "Visualizador" }),
    CUSTOM: t("team.roles.custom", { defaultValue: "Personalizado" }),
  };

  const runPendingAction = async (key: string, action: () => Promise<void>) => {
    if (pendingActions.has(key)) return;
    setPendingActions((previous) => new Set(previous).add(key));
    try {
      await action();
    } finally {
      setPendingActions((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await runPendingAction("invite", async () => {
      const res = await inviteTeamMemberAction(tenantSlug, inviteEmail, inviteRole);
      if (res.invite) {
        setInvites((prev) => [...prev, res.invite!]);
        setInviteUrl(res.inviteUrl ?? null);
        setInviteEmail("");
        toast.success(t("team.invite_success", { defaultValue: "Convite criado!" }));
      } else toast.error(res.error ?? t("common.error", { defaultValue: "Erro" }));
    });
  };

  const handleRevokeInvite = async (id: string) => {
    await runPendingAction(`revoke:${id}`, async () => {
      const res = await revokeInviteAction(tenantSlug, id);
      if (res.success) { setInvites((prev) => prev.filter((i) => i.id !== id)); toast.success(t("team.invite_revoked", { defaultValue: "Convite revogado." })); }
      else toast.error(res.error ?? t("common.error", { defaultValue: "Erro" }));
    });
  };

  const handleChangeRole = async (memberId: string, role: TeamMemberRole) => {
    await runPendingAction(`role:${memberId}`, async () => {
      const res = await updateMemberRoleAction(tenantSlug, memberId, role);
      if (res.member) setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
      else toast.error(res.error ?? t("common.error", { defaultValue: "Erro" }));
    });
  };

  const handleRemoveMember = async (id: string) => {
    await runPendingAction(`remove:${id}`, async () => {
      const res = await removeMemberAction(tenantSlug, id);
      if (res.success) { setMembers((prev) => prev.filter((m) => m.id !== id)); toast.success(t("team.member_removed", { defaultValue: "Membro removido." })); }
      else toast.error(res.error ?? t("common.error", { defaultValue: "Erro" }));
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Can resource="team" action="invite">
        <div className="bg-card-bg border border-border-neutral rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("team.invite_member", { defaultValue: "Convidar membro" })}
          </h3>
          <div className="flex gap-2 flex-wrap">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 min-w-[200px] text-sm border border-border-neutral rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
              className="text-sm border border-border-neutral rounded-lg px-2 py-2 focus:outline-none">
              {(Object.keys(ROLE_LABEL) as TeamMemberRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <AsyncButton onClick={handleInvite} disabled={!inviteEmail.trim()}
              pending={pendingActions.has("invite")}
              pendingLabel={t("team.inviting", { defaultValue: "Convidando..." })}
              className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-brand-blue/90 transition-colors">
              {t("team.invite", { defaultValue: "Convidar" })}
            </AsyncButton>
          </div>
          {inviteUrl && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-1">{t("team.invite_link_desc", { defaultValue: "Link de convite (compartilhe com o convidado):" })}</p>
              <code className="text-xs text-blue-700 break-all">{inviteUrl}</code>
            </div>
          )}
        </div>
      </Can>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-card-bg border border-border-neutral rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" /> {t("team.pending_invites", { defaultValue: "Convites pendentes" })} ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border-neutral/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{inv.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[inv.role]}`}>{ROLE_LABEL[inv.role]}</span>
                </div>
                <Can resource="team" action="invite">
                  <button onClick={() => handleRevokeInvite(inv.id)} disabled={pendingActions.has(`revoke:${inv.id}`)}
                    aria-busy={pendingActions.has(`revoke:${inv.id}`) || undefined}
                    className="p-1.5 text-text-secondary hover:text-danger transition-colors" title={t("team.revoke", { defaultValue: "Revogar" })}>
                    {pendingActions.has(`revoke:${inv.id}`)
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </Can>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="bg-card-bg border border-border-neutral rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> {t("team.team_members", { defaultValue: "Membros da equipe" })} ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">{t("team.no_members", { defaultValue: "Nenhum membro na equipe ainda." })}</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const rolePending = pendingActions.has(`role:${m.id}`);
              const removePending = pendingActions.has(`remove:${m.id}`);
              return (
              <div key={m.id} className={`flex items-center justify-between py-2 border-b border-border-neutral/50 last:border-0 ${!m.isActive ? "opacity-50" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-text-primary">{m.name}</p>
                  <p className="text-xs text-text-secondary">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Can
                    resource="team"
                    action="editPermissions"
                    fallback={
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLOR[m.role]}`}>
                        {ROLE_LABEL[m.role]}
                      </span>
                    }
                  >
                    <div className="relative">
                      <select value={m.role} onChange={(e) => handleChangeRole(m.id, e.target.value as TeamMemberRole)}
                        disabled={rolePending || removePending}
                        aria-busy={rolePending || undefined}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 appearance-none cursor-pointer pr-6 ${ROLE_COLOR[m.role]}`}>
                        {(Object.keys(ROLE_LABEL) as TeamMemberRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                      {rolePending
                        ? <Loader2 className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none opacity-60" aria-hidden="true" />
                        : <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 rounded-lg transition-colors"
                      title="Personalizar permissões granulares"
                    >
                      <Shield className="w-3.5 h-3.5" /> Permissões
                    </button>
                  </Can>
                  <Can resource="team" action="removeMember">
                    <button onClick={() => handleRemoveMember(m.id)} disabled={removePending || rolePending}
                      aria-busy={removePending || undefined}
                      className="p-1 text-text-secondary hover:text-danger transition-colors" title={t("common.delete", { defaultValue: "Remover" })}>
                      {removePending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </Can>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberPermissionsModal
          tenantSlug={tenantSlug}
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
