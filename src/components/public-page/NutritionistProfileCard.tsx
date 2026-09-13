"use client";
import { MapPin, Award, Users, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface NutritionistProfileCardProps {
  name: string;
  crn: string;
  city: string;
  state: string;
  profileImageUrl: string | null;
  specialties: string[];
  activePatientCount?: number;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
  return (
    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-blue-soft to-brand-blue/20 flex items-center justify-center border-4 border-white/60 dark:border-white/10 shadow-md">
      <span className="text-2xl font-bold text-brand-blue">{initials}</span>
    </div>
  );
}

export function NutritionistProfileCard({
  name,
  crn,
  city,
  state,
  profileImageUrl,
  specialties,
  activePatientCount,
}: NutritionistProfileCardProps) {
  const { t } = useI18n();

  return (
    <div className="bg-card-bg rounded-2xl border border-border-neutral shadow-xl shadow-black/6 dark:shadow-black/25 overflow-hidden">
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-brand-blue via-brand-blue/70 to-emerald-400/80" />

      <div className="p-6 sm:p-7">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-4">
            {profileImageUrl && profileImageUrl.trim() !== "" ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-border-neutral shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profileImageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Initials name={name} />
            )}
          </div>

          {/* "Atendimento humanizado" badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full mb-3">
            <Sparkles className="w-3 h-3" />
            {t("public_page.profile.humanized_care")}
          </span>

          <h2 className="text-xl font-bold text-text-primary">{name}</h2>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-brand-blue shrink-0" />
              {crn}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-brand-blue shrink-0" />
              {city}, {state}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-neutral mb-4" />

        {/* Specialties */}
        {specialties.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
              {t("public_page.sections.specialties")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {specialties.slice(0, 6).map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 bg-brand-blue-soft text-brand-blue text-xs font-medium rounded-full"
                >
                  {s}
                </span>
              ))}
              {specialties.length > 6 && (
                <span className="px-2.5 py-1 bg-warm-surface text-text-secondary text-xs rounded-full">
                  +{specialties.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Patient count */}
        {activePatientCount && activePatientCount >= 5 && (
          <div className="flex items-center gap-2 text-sm text-text-secondary border-t border-border-neutral pt-4">
            <Users className="w-4 h-4 text-brand-blue shrink-0" />
            <span>
              <strong className="text-text-primary">{activePatientCount}+</strong>{" "}
              {t("public_page.profile.patients_count").replace("{count}+", "").trim()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
