"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Apple, TrendingUp, BookOpen, Calendar, FileText, MessageCircle, Video, LogOut, Calculator, Target, MoreHorizontal, X, Smile, CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { logoutPatientAction } from "@/actions/patient-portal.action";
import { PortalLoadingLink } from "@/components/patient-portal/PortalLoadingLink";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
}

export function PortalNav({ tenantSlug }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/portal/${tenantSlug}`;
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const links = [
    { href: base, label: "Início", icon: Home },
    { href: `${base}/cardapio`, label: "Cardápio", icon: Apple },
    { href: `${base}/evolucao`, label: "Evolução", icon: TrendingUp },
    { href: `${base}/diario`, label: "Diário", icon: BookOpen },
    { href: `${base}/agenda`, label: "Agenda", icon: Calendar },
    { href: `${base}/calculadora`, label: "TACO", icon: Calculator },
    { href: `${base}/metas`, label: "Metas", icon: Target },
    { href: `${base}/arquivos`, label: "Arquivos", icon: FileText },
    { href: `${base}/chat`, label: "Chat", icon: MessageCircle },
    { href: `${base}/atendimentos`, label: "Consultas", icon: Video },
    { href: `${base}/checkin`, label: "Check-in", icon: Smile },
    { href: `${base}/tarefas`, label: "Tarefas", icon: CheckSquare },
  ];

  const primaryLinks = links.slice(0, 4);
  const secondaryLinks = links.slice(4);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutPatientAction();
      toast.success("Saiu com sucesso.");
      router.push(`/portal/${tenantSlug}/login`);
    } catch (error) {
      setLoggingOut(false);
      throw error;
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-border-neutral z-40 p-4">
        <div className="mb-6 px-2">
          <p className="text-xs text-text-secondary uppercase font-semibold tracking-wider">Portal do Paciente</p>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <PortalLoadingLink
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-brand-blue text-white"
                  : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </PortalLoadingLink>
          ))}
        </nav>
        <AsyncButton
          onClick={handleLogout}
          pending={loggingOut}
          pendingLabel="Saindo..."
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-danger transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </AsyncButton>
      </aside>

      {/* Mobile: "Mais" drawer overlay */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/30"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Mais opções</p>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-warm-beige">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {secondaryLinks.map(({ href, label, icon: Icon }) => (
                <PortalLoadingLink
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                    pathname === href
                      ? "bg-brand-blue text-white"
                      : "bg-warm-beige text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </PortalLoadingLink>
              ))}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut || undefined}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium bg-red-50 text-danger transition-colors"
              >
                {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <LogOut className="w-5 h-5" />}
                {loggingOut ? "Saindo..." : "Sair"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-neutral z-40 flex items-center justify-around px-1 py-1.5">
        {primaryLinks.map(({ href, label, icon: Icon }) => (
          <PortalLoadingLink
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 text-xs transition-colors ${
              pathname === href ? "text-brand-blue font-semibold" : "text-text-secondary"
            }`}
          >
            <Icon className={`w-5 h-5 ${pathname === href ? "stroke-[2.5px]" : ""}`} />
            <span className="text-[10px]">{label}</span>
          </PortalLoadingLink>
        ))}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 text-xs transition-colors ${
            moreOpen ? "text-brand-blue font-semibold" : "text-text-secondary"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>
    </>
  );
}
