# Audit: Cache e Navegação Rápida — NutriOpus

**Data:** 2026-06-29  
**Versão Next.js:** 16.2.7  
**Versão React:** 19.2.4

## Findings

### 1. staleTimes — não configurado (ROOT CAUSE)
O Next.js 16 define `dynamic: 0` por padrão, ou seja, **zero cache** para rotas dinâmicas no Router Cache do cliente. Navegar para o dashboard e voltar em 5 segundos ainda refaz todos os 11 queries no banco.

**Fix:** `experimental.staleTimes: { dynamic: 30, static: 300 }` em `next.config.ts`.

### 2. unstable_cache — zero uso antes do sprint
Todos os 11 queries paralelos do dashboard iam direto ao banco a cada request. Com 60 RPM de uma nutricionista ativa, isso gerava ~660 queries/hora para dados que raramente mudam em 60s.

**Fix:** `src/lib/cache/dashboard-cache.ts` com wrappers `unstable_cache` por `nutritionistId`.

### 3. revalidatePath — 78 chamadas, bem escopadas
As ações já usam paths específicos (não wildcard). Nenhuma invalidação excessiva detectada.

### 4. router.refresh() — 3 ocorrências, todas legítimas
- `GenerateShoppingListCard.tsx:32` — após geração de lista
- `PatientShoppingListPage.tsx:101,106` — após mutações na lista

Essas são corretas: a lista de compras precisa atualizar dados RSC após mutação.

### 5. SmartPrefetchLink — existia, não estava nas breadcrumbs
`HoverPrefetchLink` + `SmartPrefetchLink` já criados, mas `AppBreadcrumbs` usava `Link` simples. Fix: trocar para `SmartPrefetchLink`.

### 6. window.location — 4 ocorrências, apenas para extração de origem
`window.location.origin` para construir URLs absolutas em formulários. Não é navegação imperativa.

### 7. revalidateTag — API mudou no Next.js 16
Em Next.js 16, `revalidateTag` exige segundo argumento `profile` (novo sistema `use cache`). Por isso, os helpers de revalidação usam apenas `revalidatePath`.

## Priorização de impacto

| Fix | Impacto | Complexidade |
|-----|---------|--------------|
| staleTimes | ★★★★★ | Baixa (1 linha) |
| unstable_cache dashboard | ★★★★ | Média |
| SmartPrefetchLink breadcrumbs | ★★ | Baixa |
| Snapshot store client | ★★ | Média |
