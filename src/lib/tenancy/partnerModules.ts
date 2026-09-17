export const PARTNER_SHAREABLE_MODULES = [
  "today",
  "habits",
  "finance",
  "investments",
  "career",
  "tasks",
  "projects",
  "goals",
  "calendar",
  "insights",
] as const;

export type PartnerModule = (typeof PARTNER_SHAREABLE_MODULES)[number];

export function isPartnerModule(value: string): value is PartnerModule {
  return (PARTNER_SHAREABLE_MODULES as readonly string[]).includes(value);
}
