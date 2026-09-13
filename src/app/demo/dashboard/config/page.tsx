"use client";

// Demo settings = the REAL ConfigPageClient with mock defaults. The bound
// action is replaced by a local no-op that reports success without saving.
import { ConfigPageClient } from "@/components/config/ConfigPageClient";
import { demoNutritionist } from "@/demo/demo-data";

type ActionState = { error?: string; success?: boolean } | null;

async function demoSaveAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  // Demo mode: pretend the save worked; nothing is persisted.
  return { success: true };
}

export default function DemoConfigPage() {
  return (
    <ConfigPageClient
      tenant="demo"
      nutritionistSlug="demo"
      hasGoogleToken={false}
      defaultValues={{
        name: demoNutritionist.name,
        crn: demoNutritionist.crn,
        email: "fabiola.demo@exemplo.com",
        bio: "Nutricionista clínica com foco em emagrecimento saudável e reeducação alimentar.",
        whatsapp: "(92) 99999-0000",
        clinicAddress: "Av. Exemplo, 1000 — Sala 42",
        city: demoNutritionist.city,
        state: "AM",
        profileImageUrl: "",
        themePrimaryColor: "",
        specialtiesRaw: "Emagrecimento, Nutrição esportiva, Saúde da mulher",
      }}
      boundAction={demoSaveAction}
    />
  );
}
