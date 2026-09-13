"use client";
import Link from "next/link";
import { MapPin, Mail, MessageCircle, ClipboardList, Building2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface PublicContactSectionProps {
  slug: string;
  name: string;
  whatsapp: string | null;
  email: string;
  clinicAddress: string | null;
  city: string;
  state: string;
}

export function PublicContactSection({
  slug,
  name,
  whatsapp,
  email,
  clinicAddress,
  city,
  state,
}: PublicContactSectionProps) {
  const { t } = useI18n();

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;

  const contactItems = [
    whatsapp && {
      icon: MessageCircle,
      label: t("public_page.contact.whatsapp"),
      value: whatsapp,
      href: whatsappLink!,
      external: true,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      icon: Mail,
      label: t("public_page.contact.email"),
      value: email,
      href: `mailto:${email}`,
      external: false,
      color: "text-brand-blue",
      bg: "bg-brand-blue-soft",
    },
    clinicAddress && {
      icon: Building2,
      label: t("public_page.contact.address"),
      value: clinicAddress,
      href: `https://maps.google.com/?q=${encodeURIComponent(clinicAddress)}`,
      external: true,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: MapPin,
      label: t("public_page.contact.location"),
      value: `${city}, ${state}`,
      href: null,
      external: false,
      color: "text-text-secondary",
      bg: "bg-warm-surface",
    },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    label: string;
    value: string;
    href: string | null;
    external: boolean;
    color: string;
    bg: string;
  }>;

  return (
    <section id="contato" className="py-20 bg-warm-surface scroll-mt-[68px]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: title + CTA */}
          <div>
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                {t("public_page.sections.contact")}
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                {t("public_page.sections.how_it_works_subtitle")}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <Link
                href={`/${slug}/pre-consulta`}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-semibold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <ClipboardList className="w-4 h-4" />
                {t("public_page.actions.fill_preconsultation")}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </ScrollReveal>
          </div>

          {/* Right: contact list */}
          <div className="space-y-3">
            {contactItems.map((item, i) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-start gap-3.5 p-4 bg-card-bg rounded-xl border border-border-neutral hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">
                      {item.label}
                    </div>
                    <div className={`text-sm font-medium truncate ${item.href ? item.color : "text-text-primary"}`}>
                      {item.value}
                    </div>
                  </div>
                </div>
              );

              return (
                <ScrollReveal key={item.label} delay={0.05 + i * 0.06}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                    >
                      {content}
                    </a>
                  ) : (
                    <div>{content}</div>
                  )}
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
