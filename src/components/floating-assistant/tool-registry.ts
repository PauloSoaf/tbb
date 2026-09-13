"use client";

import {
  Activity,
  Calculator,
  CalendarDays,
  Droplets,
  FileText,
  NotebookTabs,
  Scale,
  Search,
  Stethoscope,
  Target,
  Utensils,
  Video,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FloatingToolId } from "./types";

export type ToolRegistryItem = {
  id: string;
  title: string;
  description: string;
  titleKey?: string;
  descriptionKey?: string;
  icon: LucideIcon;
  mode: "window" | "shortcut" | "both";
  href?: string;
  floating?: FloatingToolId;
  windowSize?: { width: number; height: number };
};

export function getToolRegistry(tenant: string): ToolRegistryItem[] {
  return [
    {
      id: "taco",
      title: "Tabela TACO",
      description: "Busca compacta com kcal e macros proporcionais.",
      href: `/dashboard/${tenant}/ferramentas/taco`,
      icon: Search,
      mode: "both",
      floating: "taco",
      windowSize: { width: 420, height: 520 },
    },
    {
      id: "portion-converter",
      title: "Conversor de porcoes",
      description: "Gramas, medidas caseiras e nutrientes estimados.",
      titleKey: "household_measures.floating_title",
      descriptionKey: "household_measures.floating_desc",
      href: `/dashboard/${tenant}/ferramentas/taco`,
      icon: Utensils,
      mode: "both",
      floating: "portion-converter",
      windowSize: { width: 460, height: 620 },
    },
    {
      id: "bmi",
      title: "Calculadora de IMC",
      description: "Peso, altura, resultado e classificacao OMS.",
      href: `/dashboard/${tenant}/ferramentas/calculadoras`,
      icon: Scale,
      mode: "both",
      floating: "bmi",
      windowSize: { width: 360, height: 420 },
    },
    {
      id: "macros",
      title: "Macros",
      description: "Distribua proteina, carboidrato e gordura por meta.",
      href: `/dashboard/${tenant}/ferramentas/calculadoras`,
      icon: Target,
      mode: "both",
      floating: "macros",
      windowSize: { width: 400, height: 480 },
    },
    {
      id: "water",
      title: "Agua diaria",
      description: "Estimativa por peso e ml/kg com leitura rapida.",
      href: `/dashboard/${tenant}/ferramentas/calculadoras`,
      icon: Droplets,
      mode: "both",
      floating: "water",
      windowSize: { width: 360, height: 380 },
    },
    {
      id: "tmb",
      title: "TMB e GET",
      description: "Mifflin-St Jeor com fator de atividade.",
      href: `/dashboard/${tenant}/ferramentas/calculadoras`,
      icon: Calculator,
      mode: "both",
      floating: "tmb",
      windowSize: { width: 400, height: 500 },
    },
    {
      id: "meal-studio",
      title: "Oficina de Planos",
      description: "Criador completo de planos alimentares.",
      href: `/dashboard/${tenant}/ferramentas/oficina-planos`,
      icon: Utensils,
      mode: "shortcut",
    },
    {
      id: "models",
      title: "Modelos",
      description: "Materiais e templates reutilizaveis.",
      href: `/dashboard/${tenant}/ferramentas/modelos`,
      icon: NotebookTabs,
      mode: "shortcut",
    },
    {
      id: "reports",
      title: "Relatorio da Clinica",
      description: "KPIs, engajamento e visao gerencial.",
      href: `/dashboard/${tenant}/ferramentas/relatorio-clinica`,
      icon: FileText,
      mode: "shortcut",
    },
    {
      id: "anthropometry",
      title: "Antropometria",
      description: "Registre medidas dentro do prontuario do paciente.",
      href: `/dashboard/${tenant}/pacientes`,
      icon: Activity,
      mode: "shortcut",
    },
    {
      id: "agenda",
      title: "Agenda",
      description: "Consultas, horarios e retornos.",
      href: `/dashboard/${tenant}/agenda`,
      icon: CalendarDays,
      mode: "shortcut",
    },
    {
      id: "care-session",
      title: "Atendimento online",
      description: "Salas de video e fluxo de atendimento.",
      href: `/dashboard/${tenant}/atendimentos`,
      icon: Video,
      mode: "shortcut",
    },
    {
      id: "compare-patients",
      title: "Comparar Pacientes",
      description: "Compare progresso e metricas entre pacientes.",
      href: `/dashboard/${tenant}/ferramentas/comparar-pacientes`,
      icon: Users,
      mode: "shortcut",
    },
    {
      id: "adipometer",
      title: "Adipometro",
      description: "Protocolos de dobras dentro das medidas.",
      href: `/dashboard/${tenant}/pacientes`,
      icon: Stethoscope,
      mode: "shortcut",
    },
  ];
}

export function getWindowToolById(tenant: string, toolId: FloatingToolId) {
  return getToolRegistry(tenant).find((tool) => tool.floating === toolId);
}
