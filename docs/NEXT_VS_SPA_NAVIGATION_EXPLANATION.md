# Por que Angular/Vite parece mais rápido que Next.js na navegação?

## A diferença fundamental

**SPAs (Angular, Vite+React, Vue)** mantêm todo o estado da aplicação na memória do cliente. Navegar de `/dashboard` para `/pacientes` e voltar para `/dashboard` é instantâneo porque o JavaScript do componente nunca foi descarregado — ele simplesmente re-renderiza com os dados que já estão no estado local.

**Next.js App Router (RSC)** funciona diferente. Cada rota dinâmica renderiza no servidor — Next.js serializa o resultado como "RSC Payload" (um formato binário que descreve a árvore de componentes) e envia para o cliente. Por padrão, o cache deste payload tem TTL = 0 para rotas dinâmicas (`staleTimes.dynamic = 0`), o que significa que qualquer navegação para uma rota já visitada re-executa tudo no servidor.

```
SPA navigation:
  /dashboard → /pacientes → (back) /dashboard
                                    ↑ já está em memória, 0ms

Next.js (padrão):
  /dashboard → /pacientes → (back) /dashboard
                                    ↑ nova requisição ao servidor + 11 queries SQL
```

## Como o NutriOpus resolve isso

### Camada 1: Router Cache (`staleTimes`)

Configurado em `next.config.ts`:

```ts
experimental: {
  staleTimes: {
    dynamic: 300,  // 5 minutos — RSC payload fica em memória no browser
    static: 1800,  // 30 minutos — páginas estáticas
  },
},
```

Com `dynamic: 300`, o cliente mantém o RSC payload por 5 minutos. Navegar para uma rota visitada nos últimos 5 minutos é instantâneo — sem round-trip ao servidor.

### Camada 2: Data Cache (`unstable_cache`)

Mesmo quando o Router Cache expira, as queries do banco ficam cacheadas no servidor:

```ts
// src/lib/cache/dashboard-cache.ts
export function getDashboardStatsCached(nutritionistId: string) {
  return unstable_cache(
    () => getDashboardStats(nutritionistId),
    ["dashboard-stats", nutritionistId],
    { revalidate: 300, tags: [cacheTags.dashboard(nutritionistId)] }
  )();
}
```

- **Stats/dados estáveis**: TTL de 300s (5 min)
- **Consultas do dia**: TTL de 120s (2 min)
- **Mensagens não lidas**: TTL de 30s (latência-sensível)
- **Dados do paciente**: sem cache por TTL — invalidação por evento

Cada cache é **isolado por `nutritionistId`**: nutricionista A nunca vê dados de nutricionista B.

### Camada 3: Invalidação por evento (não por TTL)

A estratégia não é "esperar o TTL acabar após uma mutação". Cada Server Action invalida cirurgicamente os caches afetados:

```ts
// Ao criar uma consulta:
createAppointmentAction → salva no banco → invalidateAfterAppointmentMutation({
  nutritionistId,
  tenant,
  patientId,
})

// Que por sua vez invalida:
// - tag "dashboard:<nutritionistId>"       → agenda, stats
// - tag "agenda:<nutritionistId>"
// - tag "appointments:<nutritionistId>"
// - tag "patient:<nutritionistId>:<patientId>"
// - path "/dashboard/<tenant>"
// - path "/dashboard/<tenant>/agenda"
// - path "/dashboard/<tenant>/pacientes/<patientId>"

// Mantém cache intacto de:
// - TACO (dados nutricionais)
// - Medidas caseiras
// - Outros pacientes não relacionados
// - Portal de outros pacientes
```

O helper central está em `src/lib/cache/invalidate-nutriopus-cache.ts`.

### Camada 4: TanStack Query (cliente)

Para componentes Client que fazem fetches após a carga inicial (ex: chat ao vivo, atualização de status), o TanStack Query mantém cache local:

```ts
// src/lib/query/query-client.ts
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,  // 5 min — não re-faz a query se dados recentes
    gcTime: 30 * 60 * 1000,    // 30 min — mantém em memória mesmo sem subscribers
    refetchOnWindowFocus: false, // não re-busca ao alt+tab
  },
}
```

## Comparação de comportamento

| Cenário | SPA (Angular) | Next.js padrão | Next.js + Sprint Cache |
|---------|--------------|----------------|------------------------|
| Voltar ao dashboard (5min) | 0ms (memória) | ~400ms (server) | ~0ms (Router Cache) |
| Voltar ao dashboard (6min) | 0ms (memória) | ~400ms (server) | ~50ms (Data Cache hit) |
| Após criar consulta | dados stale até F5 | dados frescos | dados frescos em <100ms |
| Troca de tenant | re-fetch | re-fetch | re-fetch (correto — isolamento) |

## Por que não fazer tudo SPA?

Next.js App Router com RSC oferece:
- **SEO** — HTML renderizado no servidor é indexável
- **Performance inicial** — primeiro carregamento sem hydration waterfall
- **Segurança** — lógica sensível nunca chega ao cliente
- **Simplicidade** — componentes de servidor leem o banco diretamente sem APIs REST

Com a camada de cache configurada, o NutriOpus combina a performance de navegação de um SPA com os benefícios de SSR.

## Arquivos relevantes

| Arquivo | Responsabilidade |
|---------|-----------------|
| `next.config.ts` | `staleTimes` — Router Cache TTL |
| `src/lib/cache/dashboard-cache.ts` | `unstable_cache` wrappers para o dashboard |
| `src/lib/cache/cache-tags.ts` | Hierarquia de tags de cache |
| `src/lib/cache/invalidate-nutriopus-cache.ts` | Helpers de invalidação por domínio |
| `src/lib/cache/cache-invalidation-map.ts` | Mapeamento mutação → tags afetadas |
| `src/lib/query/query-client.ts` | TanStack Query config |
| `src/lib/query/query-keys.ts` | Hierarquia de chaves TanStack |
