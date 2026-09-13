# SEO e Core Web Vitals no NutriOpus

## Páginas públicas

Rotas que devem ter atenção especial com SEO:

- `/` — landing page
- `/[tenant]` — página pública da nutricionista
- `/[tenant]/pre-consulta` — formulário de pré-consulta
- `/portal/[tenant]/login` — login do portal do paciente

Para essas rotas:
- Usar `export const metadata: Metadata = { title, description, openGraph }` em cada page.tsx
- Conteúdo principal visível sem depender de JS (SSR correto)
- Imagens com `next/image` e `alt` correto
- Não usar `"use client"` na page raiz dessas rotas

## Páginas privadas

Dashboard (`/dashboard/[tenant]/*`) e Portal autenticado:
- SEO não é prioridade (behind auth)
- UX e Core Web Vitals ainda importam para usabilidade

## LCP (Largest Contentful Paint)

Elementos críticos para LCP:
- O header da página (DashboardHeader)
- O primeiro card visível
- A foto/avatar do paciente em prontuário

Boas práticas:
- DashboardHeader deve aparecer o mais rápido possível (implementado via loading.tsx com header real)
- Imagens de perfil: usar `priority` em next/image para above-the-fold
- Não bloquear render com queries desnecessárias antes do header

## INP (Interaction to Next Paint)

- Botões de ação devem ter resposta visual imediata (loading spinner, disabled state)
- Ver: `NewCareSessionForm` — botão "Criar atendimento" já tem Loader2 animate-spin
- Client components com interações pesadas devem usar `useTransition` ou loading states

## CLS (Cumulative Layout Shift)

Fontes de layout shift a evitar:
- Skeleton com tamanho diferente do conteúdo real
- Imagens sem dimensões definidas
- Conteúdo condicional que empurra layout quando aparece
- Loading.tsx que não preserva o espaço do DashboardHeader

Implementado: DashboardHeader no loading.tsx garante que o header ocupa o mesmo espaço
antes e depois da page carregar. Zero layout shift no header.

## SSR

- Todos os server components fazem SSR automaticamente no App Router
- Client components (`"use client"`) fazem SSR + hidratação
- Nunca buscar dados críticos em `useEffect` (não faz SSR)
- `I18nProvider` é seeded no root layout com locale do cookie — i18n funciona em SSR

## Streaming

- Implementado via `<Suspense>` nas páginas pesadas
- PatientDetailPage: shell (DashboardHeader + PatientStickyHeader) streama primeiro
- PatientBodyContent: streama depois com 12 queries em paralelo

## Metadata

Padrão para novas páginas:
```tsx
export const metadata: Metadata = {
  title: "Nome da Página | NutriOpus",
  description: "Descrição clara da página",
  openGraph: {
    title: "Nome da Página",
    description: "Descrição",
    type: "website",
  },
};
```

Para páginas dinâmicas usar `generateMetadata`:
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { tenant } = await params;
  const nutritionist = await getNutritionistBySlug(tenant);
  return {
    title: `${nutritionist.name} | NutriOpus`,
    description: nutritionist.bio ?? "Nutricionista",
  };
}
```

## Imagens

- `public/uploads/` — imagens de perfil e uploads
- Usar `next/image` sempre que possível para otimização automática
- Para imagens above-the-fold: `priority={true}`
- Sempre definir `width` e `height` ou usar `fill` com container de tamanho fixo

## Loading UI

- Não usar spinners redondos genéricos em tela cheia
- Skeleton deve ter a mesma estrutura visual do conteúdo real
- Ver: `src/components/skeletons/` para exemplos corretos
- `loading.tsx` deve cobrir APENAS o conteúdo — nunca o shell (sidebar, navbar, DashboardHeader)

## O que evitar

- `export default function Page() { ... }` com `"use client"` no topo em páginas públicas
- `useEffect` para fetch de dados que deveriam ser SSR
- Imagens sem `alt`
- Metadata hardcoded sem considerar i18n
- `<head>` manual em vez de `export const metadata`
- Queries de dados na raiz de client components
