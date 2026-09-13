# Sprint: Cache Inteligente de Navegação — Relatório

**Sprint:** Cache Inteligente  
**Data:** 2026-06-29  
**Status:** Concluído

## Problema

Navegar para outra tela e voltar ao dashboard ainda carregava como primeira visita. Root cause: `staleTimes` não configurado (`dynamic: 0` por padrão no Next.js 16) + zero server-side cache nos 11 queries do dashboard.

## Solução implementada

### 1. `next.config.ts` — staleTimes (MAIOR IMPACTO)

```ts
experimental: {
  staleTimes: {
    dynamic: 30,
    static: 300,
  },
}
```

Antes: cada back-navigation = 11 queries ao banco + RSC re-render.  
Depois: back em < 30s = payload RSC servido do Router Cache em ~0ms.

### 2. `src/lib/cache/dashboard-cache.ts`

11 wrappers `unstable_cache` para as funções do `dashboard.service.ts`, cada uma:
- Key única por `nutritionistId` (sem leaks cross-tenant)
- TTL 30-60s conforme sensibilidade dos dados
- Tag `dashboard:${nutritionistId}` para invalidação futura

### 3. `src/app/dashboard/[tenant]/page.tsx`

Trocadas as 11 importações diretas do service pelos wrappers cacheados.

### 4. `src/lib/cache/cache-tags.ts`

Constantes para nomes de tags de cache, incluindo sempre o ID do tenant:
- `dashboard:{id}`, `patients:{id}`, `patient:{id}:{patientId}`, etc.

### 5. `src/lib/revalidation/revalidate-nutriopus.ts` (refatorado)

Helpers centralizados para revalidação após mutações, usando `revalidatePath` com o segundo argumento `"page"` conforme a API do Next.js 16.

### 6. `src/lib/client-cache/dashboard-snapshot-store.ts`

Store in-memory client-side para snapshot do último estado do dashboard. TTL: 5 minutos. Para uso futuro com optimistic UI quando o Router Cache expirou.

### 7. `src/components/navigation/AppBreadcrumbs.tsx`

Trocado `Link` por `SmartPrefetchLink` (hover prefetch). `SmartPrefetchLink` e `HoverPrefetchLink` já existiam mas não estavam nas breadcrumbs.

## Arquivos criados/modificados

| Arquivo | Operação |
|---------|----------|
| `next.config.ts` | Modificado — added staleTimes |
| `src/lib/cache/cache-tags.ts` | Criado |
| `src/lib/cache/dashboard-cache.ts` | Criado |
| `src/lib/client-cache/dashboard-snapshot-store.ts` | Criado |
| `src/lib/revalidation/revalidate-nutriopus.ts` | Refatorado |
| `src/app/dashboard/[tenant]/page.tsx` | Modificado — usa cached functions |
| `src/components/navigation/AppBreadcrumbs.tsx` | Modificado — SmartPrefetchLink |

## Resultado esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Volta ao dashboard < 30s | ~400-800ms | ~0ms (Router Cache) |
| Volta ao dashboard > 30s | ~400-800ms | ~100-200ms (Data Cache hit) |
| Volta ao dashboard > 60s | ~400-800ms | ~400-800ms (DB, mas paralelo) |
| Queries ao banco/hora dashboard ativo | 660+ | ~60 (1/minuto max) |

## Notas técnicas

- `revalidateTag` no Next.js 16 exige segundo argumento `profile` (novo sistema `use cache` / cacheLife). Os helpers de revalidação usam apenas `revalidatePath` por enquanto.
- O `unstable_cache` é independente do `use cache` — ainda funciona normalmente com `revalidatePath` para invalidação.
- `tsc --noEmit` zero erros após implementação.
