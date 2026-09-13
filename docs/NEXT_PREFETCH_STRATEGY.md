# Prefetch Strategy — NutriOpus

## Links na Sidebar

A sidebar usa `Link` com `prefetch={true}` — o Next.js faz prefetch quando o link entra no viewport. Como a sidebar está sempre visível, **todas as rotas do dashboard são prefetchadas** quando a sidebar monta.

Com `staleTimes: { dynamic: 30 }`, o payload prefetchado dura 30s no Router Cache.

## Breadcrumbs

`AppBreadcrumbs` agora usa `SmartPrefetchLink` → `HoverPrefetchLink`, que chama `router.prefetch()` explicitamente no hover. Isso adiciona ~300ms de head-start antes do click.

## SmartPrefetchLink / HoverPrefetchLink

```tsx
// src/components/navigation/HoverPrefetchLink.tsx
export function HoverPrefetchLink({ href, children, ...props }: Props) {
  const router = useRouter();
  const hrefStr = typeof href === "string" ? href : String(href);
  return (
    <Link
      href={href}
      onMouseEnter={() => router.prefetch(hrefStr)}
      onFocus={() => router.prefetch(hrefStr)}
      {...props}
    >
      {children}
    </Link>
  );
}
```

`router.prefetch()` antecipa a busca do payload RSC — se o usuário clicar em 300ms+, a página já está no cache.

## Pendência: cards de pacientes

Os cards de pacientes (`/pacientes/[id]`) não têm hover prefetch. O payload da página de detalhes é grande (12 queries). A ser adicionado como melhoria futura via `SmartPrefetchLink`.

## Não usar prefetch={false}

Nenhum link usa `prefetch={false}`. Isso é correto — não desabilitar prefetch em links de dashboard, pois prejudica a percepção de velocidade.
