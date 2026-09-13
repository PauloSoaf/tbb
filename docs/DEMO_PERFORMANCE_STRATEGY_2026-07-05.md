# Demo Mode — Estratégia de Performance

> Data: 2026-07-05

## Por que a demo é mais rápida que o app real

O app real paga, por navegação: auth + queries no Supabase (rede) + render RSC. A demo **não paga nada disso**:

1. **Zero I/O**: dados são módulos JS locais (`demo-data.ts`) — nenhuma query, nenhum fetch, nenhuma API.
2. **Zero auth**: sem cookies, sem `assertTenantAccess`, sem redirect de login.
3. **Client-first**: todas as páginas são client components; após a primeira carga, a navegação entre telas demo é instantânea (Router Cache + bundle já carregado).
4. **Sem libs pesadas**: o gráfico de evolução é um `<svg><polyline/></svg>` puro (`DemoSparkline`) — nada de recharts/chart.js no bundle da demo; ícones são lucide (tree-shaken, já no vendor do app).
5. **Sem providers caros**: nenhum WebRTC, nenhuma IA, nenhum PDF real — features pesadas aparecem como bloqueadas (`DemoUnavailable`) com tooltip.
6. **Estado em memória**: mutações são `setState` + `localStorage` — latência de ação ~0 ms.

## Sobre dynamic import

O plano original previa `next/dynamic` para módulos pesados (editor de plano, PDF, call room). Na implementação final isso ficou **desnecessário**: a demo não importa nenhum desses módulos — as telas demo são leves por construção (a rota mais pesada é o prontuário, que é texto + um SVG). Se no futuro a demo passar a embutir o editor real da Oficina de Planos, aí sim envolvê-lo em `dynamic(() => import(...), { ssr: false })`.

## Metas e como medir

Metas: primeira carga `/demo/dashboard` e `/demo/portal` < 1,5 s em `npm run build && npm run start` local; troca entre telas demo < 200 ms após a primeira carga.

```bash
npm run build && npm run start
# abrir http://localhost:3000/demo/dashboard com o Network aberto:
# nenhuma request de API/banco deve aparecer — só assets estáticos.
```
