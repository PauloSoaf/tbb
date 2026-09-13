import Link from "next/link";

import {
  MapPin,
  Award,
  MessageCircle,
  ClipboardList,
  Users,
  LogIn,
} from "lucide-react";

interface NutritionistCardProps {
  slug: string;
  name: string;
  crn: string;
  bio: string | null;
  city: string;
  state: string;
  whatsapp: string | null;
  specialties: string[];
  profileImageUrl: string | null;
  activePatientCount?: number;
}

export function NutritionistCard({
  slug,
  name,
  crn,
  bio,
  city,
  state,
  whatsapp,
  specialties,
  profileImageUrl,
  activePatientCount,
}: NutritionistCardProps) {
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Card */}
      <div className="bg-card-bg rounded-2xl shadow-lg shadow-black/5 border border-border-neutral overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-brand-blue to-brand-blue-hover p-8 text-center text-white">
          {profileImageUrl && profileImageUrl.trim() !== "" && (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 overflow-hidden shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profileImageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold">{name}</h1>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-white/80">
            <Award className="w-4 h-4" />
            <span className="text-sm">{crn}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-white/80">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">
              {city}, {state}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Bio */}
          {bio && (
            <p className="text-text-secondary leading-relaxed text-center">
              {bio}
            </p>
          )}

          {/* Specialties */}
          {specialties.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="px-3 py-1.5 bg-brand-blue-soft text-brand-blue text-sm font-medium rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {/* Social proof */}
          {activePatientCount && activePatientCount >= 5 && (
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
              <Users className="w-4 h-4 text-brand-blue" />
              <span><strong className="text-text-primary">{activePatientCount}+</strong> pacientes em acompanhamento</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Link
              href={`/${slug}/pre-consulta`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-brand-blue text-white
                rounded-xl font-semibold shadow-md shadow-brand-blue/20
                hover:bg-brand-blue-hover hover:shadow-lg
                transition-all duration-300"
            >
              <ClipboardList className="w-5 h-5" />
              Preencher pré-consulta
            </Link>

            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-green-500 text-white
                  rounded-xl font-semibold shadow-md shadow-green-500/20
                  hover:bg-green-600 hover:shadow-lg
                  transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </a>
            )}

            <Link
              href={`/portal/${slug}/login`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 border border-border-neutral
                text-text-secondary rounded-xl font-medium
                hover:bg-warm-beige hover:text-text-primary
                transition-all duration-200 text-sm"
            >
              <LogIn className="w-4 h-4" />
              Já sou paciente — Acessar portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
