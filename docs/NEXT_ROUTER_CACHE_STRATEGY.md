# Next.js Router Cache Strategy — NutriOpus

## O que é o Router Cache

O Router Cache é o cache **client-side** do Next.js App Router. Ele armazena o payload RSC (React Server Components) de páginas visitadas na memória do browser. Quando o usuário navega para uma rota já no cache, a página é restaurada **instantaneamente** — sem round-trip ao servidor.

## Configuração no NutriOpus

```ts
// next.config.ts
experimental: {
  staleTimes: {
    dynamic: 30,   // rotas dinâmicas (dashboard, pacientes) — 30s
    static: 300,   // rotas estáticas — 5min
  },
},
```

**Antes (default):** `dynamic: 0` — cada navegação de volta refazia tudo.  
**Depois:** Router Cache retém o payload RSC por 30s. Volta em 5s = instantâneo.

## Fluxo de uma navegação

```
Usuário clica Dashboard → Paciente → volta ao Dashboard (em 15s)

COM staleTimes { dynamic: 30 }:
  Click → Router Cache hit → render imediato (0ms RTT)
  
SEM staleTimes (ou dynamic: 0):
  Click → RSC request → 11 queries DB → render (200-800ms)
```

## Regras de invalidação

O Router Cache é invalidado quando:
1. `revalidatePath()` é chamado em uma Server Action
2. O usuário faz uma mutação que chama `router.refresh()`
3. `staleTimes` expirou (30s para dinâmicas)

## Compatibilidade com unstable_cache

O `unstable_cache` opera no lado do **servidor** (Data Cache). O Router Cache opera no **cliente**. São camadas independentes:

```
Request → Router Cache (cliente, 30s) 
       → RSC Render (servidor)
         → unstable_cache (Data Cache, 30-60s)
           → Banco de dados
```

Quando ambos estão quentes: página renderiza do Router Cache em 0ms.  
Quando Router Cache expirou mas Data Cache não: RSC re-renderiza sem ir ao banco.  
Quando ambos expiraram: banco é consultado, mas com 60s de TTL isso é raro.
