# NutriOpus Cache Policy

## Camadas de Cache

```
Browser Memory (Router Cache)    — staleTimes: dynamic=30s, static=300s
Server Data Cache (unstable_cache) — TTL por tipo de dado
Database                          — fonte de verdade
```

## TTLs por tipo de dado

| Dado | Arquivo | TTL | Motivo |
|------|---------|-----|--------|
| Dashboard stats (contagens) | dashboard-cache.ts | 60s | Muda pouco em 1min |
| Anamneses recentes | dashboard-cache.ts | 60s | Estável |
| Pontos de atenção | dashboard-cache.ts | 60s | Estável |
| Alertas de humor baixo | dashboard-cache.ts | 30s | Mais sensível ao tempo |
| Check-ins de hoje | dashboard-cache.ts | 30s | Atualiza durante o dia |
| Pacientes sem check-in | dashboard-cache.ts | 60s | Muda lentamente |
| Aniversários da semana | dashboard-cache.ts | 60s | Muito estável |
| Consultas de hoje | dashboard-cache.ts | 30s | Status muda |
| Próximas consultas | dashboard-cache.ts | 60s | Estável |
| Pacientes precisando ação | dashboard-cache.ts | 60s | Estável |
| Mensagens não lidas | dashboard-cache.ts | 30s | Sensível ao tempo |

## Regras de tenant isolation

**OBRIGATÓRIO:** Todo cache key deve incluir `nutritionistId` ou `patientId`.

```ts
// CORRETO — scoped por nutritionistId
unstable_cache(fn, ["dashboard-stats", nutritionistId], ...)

// ERRADO — leaka dados entre tenants
unstable_cache(fn, ["dashboard-stats"], ...)
```

O `cacheTags` em `src/lib/cache/cache-tags.ts` gera tags sempre incluindo o ID do tenant.

## Invalidação após mutações

Quando uma mutação ocorre, o código chama `revalidatePath()` para a página afetada. Isso faz o Next.js:
1. Purgar o Router Cache daquela rota no cliente
2. Invalidar o Server-side page cache

O `unstable_cache` expira pelo seu TTL natural. Para invalidação imediata via tags, use `revalidateTag` quando a API estabilizar no Next.js 16.

## O que NÃO cachear

- Sessões de usuário (autenticação) — sempre fresh
- Dados de formulários em progresso
- Resultados de mutações
- Dados com requisitos de consistência strong (pagamentos, etc.)
