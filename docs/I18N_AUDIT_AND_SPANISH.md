# Auditoria de Internacionalização (i18n) & Espanhol

## Resumo das Modificações (Fase 1)

1. **Atualização do `I18nContext.tsx`:**
   - Adicionado suporte para espanhol (`es`).
   - Adicionado suporte nativo à interpolação de variáveis. Ex: `t("greeting", { name: "Maria" })`.
   - Adicionada injeção de cookie `NEXT_LOCALE` para permitir a leitura do idioma por Server Components.

2. **Dicionários:**
   - Criado `es.json` com toda a interface traduzida.
   - Atualizados `pt.json` e `en.json` com chaves novas para os hardcodings encontrados no Dashboard e na Sidebar.

3. **Componentes Atualizados:**
   - `LangToggle.tsx`: Transformado de um simples botão PT/EN para um dropdown premium, alinhado à interface visual do sistema, suportando PT, EN e ES, com ícones e transições.
   - `DashboardSidebar.tsx`: Substituídos todos os nomes hardcoded das ferramentas ("Atendimentos", "Equipe", etc) por chaves de `nav.*`.
   - `page.tsx` (Dashboard Main): Adicionado Helper `getServerTranslations()` (novo arquivo) para ler o cookie e traduzir Server Components diretamente via SSR, sem precisar refatorar pra client component nem expor chaves cruas!

## Próximos Passos (Fase 2+)

A regra permanente agora está documentada em `collab-IAS-REPORT.md`.
As próximas páginas a serem migradas são a Página de Pacientes e o Prontuário Clínico. Cada nova página ou feature deve incluir `pt.json`, `en.json` e `es.json` de fábrica.
