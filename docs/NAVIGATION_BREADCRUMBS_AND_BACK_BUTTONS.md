# Navigation: Breadcrumbs and Back Buttons

## Overview

NutriOpus uses a deterministic navigation system — all URLs are built from central route builders, never from template literals scattered across components. Back buttons always have descriptive labels (never icon-only).

---

## Route Builders (`src/lib/navigation/routes.ts`)

Single source of truth for all app URLs:

```ts
import { routes } from "@/lib/navigation/routes";

routes.dashboard(tenant)                         // /dashboard/nutriopus
routes.patients(tenant)                          // /dashboard/nutriopus/pacientes
routes.patient(tenant, patientId)                // /dashboard/nutriopus/pacientes/:id
routes.patientMedidas(tenant, patientId)         // /dashboard/nutriopus/pacientes/:id/medidas
routes.careSessions(tenant)                      // /dashboard/nutriopus/atendimentos
routes.careSession(tenant, sessionId)            // /dashboard/nutriopus/atendimentos/:id
routes.agenda(tenant)                            // /dashboard/nutriopus/agenda
routes.ferramentas(tenant)                       // /dashboard/nutriopus/ferramentas
routes.portalHome(tenant)                        // /portal/nutriopus
```

---

## Back Routes (`src/lib/navigation/back-routes.ts`)

Pre-built back-navigation helpers:

```ts
import { back } from "@/lib/navigation/back-routes";

back.toPatients(tenant)           // → /dashboard/nutriopus/pacientes
back.toPatient(tenant, id)        // → /dashboard/nutriopus/pacientes/:id
back.toCareSessions(tenant)       // → /dashboard/nutriopus/atendimentos
back.toFerramentas(tenant)        // → /dashboard/nutriopus/ferramentas
back.toPortalHome(tenant)         // → /portal/nutriopus
```

**Never use `router.back()` or `window.history.back()`** — these break on direct URL access and refresh.

---

## Types (`src/lib/navigation/navigation-types.ts`)

```ts
type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  current?: boolean;
};

type BackButtonConfig = {
  label: string;
  href: string;
};
```

---

## AppBreadcrumbs (`src/components/navigation/AppBreadcrumbs.tsx`)

Server-safe (no 'use client'). Renders a semantic `<nav><ol>` with proper aria.

```tsx
import { AppBreadcrumbs } from "@/components/navigation/AppBreadcrumbs";

<AppBreadcrumbs
  items={[
    { label: "Painel", href: routes.dashboard(tenant) },
    { label: "Pacientes", href: routes.patients(tenant) },
    { label: patient.name, current: true },
  ]}
  ariaLabel="Navegação"
/>
```

- `ariaLabel` defaults to `"Navegação"` — override for specific contexts
- Last item with `current: true` gets `aria-current="page"`
- First item without `icon` gets a Home icon automatically
- Labels truncate at `max-w-[140px] sm:max-w-[220px]`

---

## AppBackButton (`src/components/navigation/AppBackButton.tsx`)

Server-safe. Always renders icon + text (never icon-only).

```tsx
import { AppBackButton } from "@/components/navigation/AppBackButton";

<AppBackButton
  href={back.toPatient(tenant, patientId)}
  label={`Voltar para ${patient.name}`}
/>
```

Accessibility: the label is visible and descriptive — never just "Voltar" without context when navigating to a specific entity.

---

## DashboardHeader Integration

`DashboardHeader` accepts optional `breadcrumbs` and `backButton` props. Both are backward-compatible (undefined = no change to existing layout).

```tsx
<DashboardHeader
  title={t("patients_list.title")}
  subtitle={t("patients_list.subtitle")}
  breadcrumbs={[
    { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
    { label: t("nav.patients"), current: true },
  ]}
/>
```

```tsx
<DashboardHeader
  title={title}
  subtitle={subtitle}
  backButton={{
    href: routes.careSessions(tenant),
    label: t("navigation.back_to_care_sessions"),
  }}
  breadcrumbs={[
    { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
    { label: t("nav.care_sessions"), href: routes.careSessions(tenant) },
    { label: patient.name, current: true },
  ]}
/>
```

---

## PatientBreadcrumbs

Upgraded component — wraps `AppBreadcrumbs` internally. Still server-safe.

```tsx
import { PatientBreadcrumbs } from "@/components/layout/PatientBreadcrumbs";

// Patient detail page (no currentRoute)
<PatientBreadcrumbs tenantSlug={tenant} patient={patient} />

// Patient sub-page
<PatientBreadcrumbs
  tenantSlug={tenant}
  patient={patient}
  currentRoute="Anamnese"
  ariaLabel="Navegação do paciente"
/>
```

Renders: Painel → Pacientes → {patient.name} [→ currentRoute]

---

## i18n Keys

Navigation keys are in all three locales (PT/EN/ES):

```
navigation.back                    "Voltar"
navigation.back_to_patients        "Voltar para Pacientes"
navigation.back_to_patient         "Voltar para {{name}}"
navigation.back_to_care_sessions   "Voltar para Atendimentos"
navigation.back_to_tools           "Voltar para Ferramentas"
navigation.breadcrumb_label        "Caminho"
navigation.current_page            "Página atual"

nav.dashboard                      "Painel"
nav.patients                       "Pacientes"
nav.care_sessions                  "Atendimentos"
nav.agenda                         "Agenda"
nav.tools                          "Ferramentas"
```

---

## Tests

```
src/lib/navigation/__tests__/routes.test.ts   — 21 tests
```

Run with: `npx vitest run src/lib/navigation`

---

## Rules (from code review)

1. **Always use `routes.xxx()`** for hrefs — never template literals
2. **Back buttons must have a label** — `AppBackButton` enforces this via the required `label` prop
3. **PatientBreadcrumbs for patient hierarchy** — use when inside a patient's subroute
4. **`current: true` on last breadcrumb item** — triggers `aria-current="page"`
5. **Server-safe components** — `AppBreadcrumbs` and `AppBackButton` have no 'use client'; they work in both server and client components
