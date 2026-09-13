import Link from "next/link";
import { NutriOpusLogo } from "@/components/ui/NutriOpusLogo";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-warm-beige dark:bg-warm-beige border-t border-border-neutral py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <NutriOpusLogo
              role="img"
              aria-label="NutriOpus"
              className="h-8 w-auto mb-4"
            />
            <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
              Plataforma completa para nutricionistas organizarem sua clínica com
              tecnologia, cuidado e eficiência.
            </p>
          </div>

          {/* Links */}
          <div>
            <div className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Produto</div>
            <ul className="space-y-2.5">
              {[
                { href: "#recursos", label: "Recursos" },
                { href: "#pre-consulta", label: "Pré-consulta" },
                { href: "#portal", label: "Portal do paciente" },
                { href: "#ia", label: "IA assistiva" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Legal</div>
            <ul className="space-y-2.5">
              {[
                { href: "/privacidade", label: "Política de Privacidade" },
                { href: "/cadastro", label: "Criar conta" },
                { href: "/login", label: "Entrar" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border-neutral pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            © {year} NutriOpus. Todos os direitos reservados.
          </p>
          <p className="text-xs text-text-secondary">
            Plataforma em conformidade com a{" "}
            <Link href="/privacidade" className="underline underline-offset-2 hover:text-text-primary transition-colors">
              LGPD
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
