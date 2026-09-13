# Public Nutritionist Page Redesign

## Problema inicial
A página `/[tenant]` exibia apenas um card central simples com cabeçalho em azul sólido forte, sem narrativa, sem seções, sem animações, sem suporte a idiomas na interface e sem o seletor de tema avançado.

## Objetivo
Transformar a rota pública da nutricionista em uma mini landing page profissional com hero moderno, seções explicativas, i18n e o seletor de tema avançado (ThemeToggle).

## Nova estrutura

```
/[tenant]
├── PublicPageHeader (fixo, com nav, ThemeToggle, LangToggle)
├── PublicHero         (hero 2 colunas: texto + NutritionistProfileCard)
├── HowItWorksSection  (4 passos: pré-consulta → revisão → consulta → portal)
├── SpecialtiesSection (grade de especialidades coloridas — só aparece se tiver dados)
├── PublicContactSection (contatos + CTA de pré-consulta)
├── PublicPortalSection  (acesso ao portal do paciente)
└── PublicPageFooter   (logo NutriOpus + privacy link)
```

## Componentes criados

| Arquivo | Descrição |
|---|---|
| `src/components/public-page/PublicNutritionistPage.tsx` | Componente principal que recebe dados do server e monta a página |
| `src/components/public-page/PublicPageHeader.tsx` | Header fixo com nav âncora, LangToggle, ThemeToggle, botão portal |
| `src/components/public-page/PublicHero.tsx` | Hero 2 colunas com animações framer-motion |
| `src/components/public-page/NutritionistProfileCard.tsx` | Card com foto/avatar, CRN, cidade, especialidades |
| `src/components/public-page/HowItWorksSection.tsx` | 4 passos explicativos com ícones |
| `src/components/public-page/SpecialtiesSection.tsx` | Grade de especialidades com cores por categoria |
| `src/components/public-page/PublicContactSection.tsx` | Contatos organizados com links funcionais |
| `src/components/public-page/PublicPortalSection.tsx` | CTA para portal do paciente |
| `src/components/public-page/PublicPageFooter.tsx` | Rodapé minimal com logo e links |

## Dados usados (campos da tabela Nutritionist)
- `name`, `crn`, `bio`, `slug`
- `whatsapp`, `email`, `clinicAddress`
- `city`, `state`
- `profileImageUrl` (foto ou avatar com iniciais)
- `specialties[]`
- `themePrimaryColor` (passado mas usando tokens do sistema)

## Campos sociais suportados
Atualmente apenas `whatsapp` e `email` existem no schema.

### Campos futuros (não migrados — adicionar quando necessário)
```prisma
linkedinUrl    String?
instagramUrl   String?
websiteUrl     String?
youtubeUrl     String?
tiktokUrl      String?
doctoraliaUrl  String?
publicPhone    String?
```
O layout do `PublicContactSection.tsx` e `PublicHero.tsx` renderiza apenas campos existentes com valor (`?.filter(Boolean)`), então adicionar esses campos no futuro requer apenas:
1. Migration Prisma
2. Adicionar o campo ao map `contactItems` em `PublicContactSection.tsx`

## Tema e i18n
- Todos os componentes usam `useI18n()` → Client Components
- O `page.tsx` continua Server Component (busca dados no banco)
- Chaves `public_page.*` adicionadas em `pt.json`, `en.json`, `es.json`
- `ThemeToggle` e `LangToggle` incluídos no `PublicPageHeader`
- Suporte a todos os temas: Claro, Escuro, Nutri Azul, Folha Clínica, Areia Premium, Personalizado

## Animações
- Hero: `framer-motion` fadeUp escalonado (badge → H1 → subtitle → CTAs → profile card)
- Profile card desktop: `TiltCard` da landing (hover 3D suave)
- Seções: `ScrollReveal` da landing (fade+translate ao entrar na viewport)
- Especialidades: hover `scale-105` via CSS
- Contatos: hover `-translate-y-0.5 shadow-md` via CSS
- Folhas decorativas: `FloatingLeaf` com scroll parallax (2 instâncias, menores/suaves)
- Respeitam `prefers-reduced-motion` via framer-motion

## SEO
- `generateMetadata` dinâmico no `page.tsx`
- Title: `[Nome] | NutriOpus`
- Description: bio da nutricionista ou fallback com nome
- OpenGraph: type="profile"

## Responsividade
- Mobile-first: hero em coluna única, card abaixo do texto
- Desktop: hero 2 colunas (texto + card)
- TiltCard oculto no mobile (sem 3D em telas pequenas)
- Folhas decorativas ocultas em mobile (`hidden md:block`)
- Header mobile com hamburger + LangToggle + botão portal
- Seções com grid responsivo (1→2→4 colunas)

## Limitações
- Idioma do campo `bio` não é traduzido (texto da nutricionista, não da UI)
- Links sociais (Instagram, LinkedIn) não renderizados pois campos não existem no schema
- Fotos externas de CDN não configuradas em `next.config.js` (usa `<img>` com eslint-disable)

## Próximos passos
1. Adicionar campos sociais ao schema Prisma quando necessário
2. Configurar domínios de imagem em `next.config.js` para usar `next/image` com URLs externas
3. Adicionar seção de depoimentos/avaliações (futura funcionalidade)
4. Considerar página de "Agendar consulta online" pública
