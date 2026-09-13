# Instant Language Switch

## Problema anterior

O `LangToggle` usava `router.refresh()` + `window.location.reload()`, causando reload completo com skeleton toda vez que o usuário trocava de idioma.

## Decisão arquitetural

Nas áreas privadas do app (dashboard, portal), a troca de idioma é **client-side** via `I18nProvider`.

## Regra

**Server Components buscam dados.**
**Client Components renderizam textos traduzidos com `useI18n()`.**

## Proibido em troca de idioma

- `router.refresh()` para idioma
- `window.location.reload()` para idioma
- `router.replace()` para idioma
- `router.push()` para idioma
- texto traduzido server-side em componentes que precisam trocar instantaneamente

## Permitido

- `localStorage` para persistência do locale entre sessões
- Cookie `NEXT_LOCALE` para SSR do idioma inicial (evita flash de hidratação)
- Client context `useI18n()` para toda UI visível
- `getServerTranslations()` apenas em páginas públicas/SEO se necessário

## Como o sistema funciona

1. `layout.tsx` (Server Component) lê o cookie `NEXT_LOCALE` e passa `initialLocale` para `AppProviders`
2. `AppProviders` repassa para `I18nProvider`
3. `I18nProvider` inicia com o locale correto desde o SSR (sem flash)
4. Quando o usuário troca idioma: `setLocale()` atualiza o React state → todos os `useI18n()` re-renderizam instantaneamente
5. Cookie e localStorage são atualizados para persistência

## Padrão de tela (como criar uma nova rota)

```tsx
// ✅ CORRETO — page.tsx (Server Component)
export default async function MyPage({ params }) {
  const data = await fetchData(params.tenant); // dados do servidor
  return <MyPageClient data={data} />;
}

// ✅ CORRETO — MyPageClient.tsx (Client Component)
"use client";
export function MyPageClient({ data }) {
  const { t } = useI18n();
  return <h1>{t("my_page.title")}</h1>;
}

// ❌ ERRADO — não traduzir labels no server e passar como string
export default async function MyPage() {
  const { t } = await getServerTranslations();
  return <MyComponent title={t("my_page.title")} />; // não atualiza no cliente
}
```

## Componentes do dashboard convertidos

Todos estes eram Server Components com `getServerTranslations()` e foram convertidos para Client Components com `useI18n()`:

- `AppointmentDashboardItem.tsx`
- `TodayAppointmentsCard.tsx`
- `UpcomingAppointmentsList.tsx`
- `PatientsNeedingActionList.tsx`
- `UnreadMessagesPanel.tsx`
- `DashboardQuickActions.tsx`
- `AnamneseSummaryCard.tsx`
- `CopyPreConsultationLinkCard.tsx`
- `DashboardHeader.tsx`

## Novos arquivos

- `src/components/dashboard/DashboardPageClient.tsx` — toda a UI do dashboard
- `src/components/dashboard/DashboardAlertsClient.tsx` — alertas (check-ins, aniversários, mood baixo)
- `src/lib/i18n/formatters.ts` — helpers de data por locale

## Limitações conhecidas

Páginas que ainda passam `title={t(...)}` server-side (como `/atendimentos`, `/pacientes/novo`) não trocam de idioma instantaneamente no header. Precisarão de refatoração futura caso isso seja necessário. A prioridade era o dashboard principal.
