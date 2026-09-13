# NutriOpus - Reaudit UX Clinica Beta

Data: 2026-07-05

Este documento foi criado depois do segundo feedback do beta para evitar continuar implementando rapido demais. Ele registra referencia consultada, decisao de UX, criterio de aceite, risco e plano de teste para cada ponto.

## Referencias consultadas

- WAI-ARIA APG Tooltip Pattern: tooltips devem aparecer em hover e foco, com atraso curto, e sair em mouse out/Escape. https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- MDN ARIA tooltip role: tooltip e uma bolha contextual em hover/focus e precisa ser associada ao gatilho. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role
- Material Design 3 Tooltips: tooltips devem ser breves, informativos, especificos e de apoio contextual. https://m3.material.io/components/tooltips/guidelines
- Material Design 3 Badges: badges indicam notificacoes, contagens ou status em icones/destinos de navegacao. https://m3.material.io/components/badges/guidelines
- Fluent 2 Popover: popover serve para conteudo contextual estruturado e nao bloqueante; tooltip e para texto simples. https://fluent2.microsoft.design/components/web/react/core/popover/usage
- Carbon UI Shell Right Panel: painel direito deve ser associado a um icone, flutuar sobre conteudo e permitir apenas um painel expandido por vez. https://carbondesignsystem.com/components/UI-shell-right-panel/usage/
- Carbon Side Rail: rail pode expandir em hover/focus e retrair ao sair, mantendo navegacao por teclado. https://carbondesignsystem.com/components/UI-shell-left-panel/accessibility/
- NN/g Dashboard UX: dashboards devem permitir entendimento rapido e acao, nao apenas exibir dados. https://www.nngroup.com/articles/dashboards-preattentive/
- NN/g Alert Fatigue: alertas devem priorizar valores criticos para nao cansar o usuario. https://www.nngroup.com/videos/alert-fatigue-user-interfaces/
- OpenMRS Patient Chart: patient chart usa widgets clinicos como alergias, anexos, flags, notas, testes, biometria e banner do paciente. https://github.com/openmrs/openmrs-esm-patient-chart
- OpenMRS Patient Notes: widget de notas tem formulario para registrar notas e overview tabular. https://github.com/openmrs/openmrs-esm-patient-chart/blob/main/packages/esm-patient-notes-app/README.md
- MDN Web Speech API: SpeechRecognition existe, mas e parte de uma API com suporte variavel por navegador. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## 1. Tooltips e sino

Problema reportado:
- Tooltip preto, desalinhado com tema, cortado no sino.
- Sino abre no click, mas deveria abrir em hover/focus.
- Sino so mostrava atalhos; precisava mostrar lembretes, notificacoes e alertas atuais.

Decisao:
- Tooltip simples fica em portal (`document.body`) para nao ser cortado por containers.
- Tooltip usa tokens do tema: `--tooltip-bg`, `--tooltip-foreground`, `--tooltip-border`.
- Conteudo estruturado do sino e popover/hover-card, nao tooltip.
- Sino abre por hover/focus e mantem painel aberto enquanto o usuario interage.
- Badge mostra contagem de itens abertos; painel separa lembretes e alertas.

Estado do codigo:
- Implementado `src/components/ui/AppTooltip.tsx` com portal e colisao basica.
- Implementado `src/app/api/dashboard/[tenant]/notifications/route.ts` com lembretes ativos, consultas de hoje, anamneses novas, mensagens nao lidas e check-ins de humor baixo.
- Implementado `src/components/layout/DashboardNotificationBell.tsx` com hover/focus e dados reais.

Critérios de aceite:
- Tooltip nao pode aparecer preto no tema claro.
- Tooltip do sino nao pode ser cortado.
- Sino precisa abrir em hover e foco, e nao depender apenas de click.
- Painel precisa ter estado de loading, vazio e erro.
- Alerta deve ter prioridade visual sem excesso de vermelho/alarme.

Testes:
- TypeScript.
- Build.
- Teste manual no header com hover/focus/keyboard.
- Validar payload da API autenticada.

## 2. Tema claro e azul forte

Problema reportado:
- Primario azul forte continuou dominante.
- Bege/natural foi removido indevidamente.
- Personalizacao de navbar/sidebar era insuficiente.

Decisao corrigida em 2026-07-05:
- Restaurar base clara off-white/bege/natural.
- Trocar o token primario padrao para azul escuro NutriOpus `#08284D`.
- Usar bege `#D2AB85` como accent/secondary, com superficies suaves.
- Verde nao deve ser identidade principal; fica restrito a sucesso/status positivo.
- Manter nome `brand-blue` por compatibilidade interna, mas no tema claro ele aponta para o navy da marca.
- Criar tokens dedicados para navbar, sidebar e tooltip.
- Custom theme permite editar primary, accent, navbar/sidebar e ativo da sidebar.

Estado do codigo:
- `src/app/globals.css` recebeu tokens navy/bege no tema claro.
- `src/components/theme/custom-theme-utils.ts` normaliza configs antigas verdes para navy/bege.
- `src/components/theme/CustomThemeDialog.tsx` oferece presets NutriOpus Claro, Azul & Bege, Clinico Suave, Azul Escuro Premium e Bege Minimalista.
- `DashboardHeader`, `DashboardSidebar`, `PatientPortalHeader` e `PatientPortalSidebar` usam tokens de navbar/sidebar.
- `/login` foi repaginado com navbar de logo, idioma e tema, card branco e CTA navy.

Critérios de aceite:
- Tela clara deve ler como clinica, premium e leve com navy + bege.
- Botao primario deve usar `#08284D`; hover deve usar `#0D3768`.
- Verde nao aparece como primary/sidebar active/navbar accent no tema claro.
- Sidebar e navbar mudam quando o tema customizado muda.
- Modo dark continua com contraste suficiente.

Testes:
- TypeScript.
- Build.
- Visual em dashboard e paciente.
- Checar se dialog custom ainda persiste tema antigo com merge de defaults.

## 3. Prontuario separado de nota clinica

Problema reportado:
- Foi apenas troca de label; prontuario deveria ser area de texto com destaque.
- Prontuario e nota clinica precisam ser separados.

Decisao:
- Criar compositor principal de prontuario com textarea grande.
- Usar modos de registro: evolucao, conduta, queixa, retorno e orientacao.
- Nota clinica rapida continua menor e separada.
- Timeline/historico deve permanecer visivel abaixo.

Estado do codigo:
- `PatientProntuarioComposer` criado e salva via `addPatientNoteAction` com titulo de prontuario.
- `QuickNoteInput` agora salva como "Nota clinica".

Achado de autoauditoria:
- A timeline do prontuario ficou acidentalmente dentro de `className="hidden"` durante a tentativa de esconder o bloco antigo. Isto precisa ser corrigido antes de continuar.

Correcao aplicada:
- Timeline do prontuario restaurada como card visivel abaixo do compositor principal e da nota clinica rapida.

Critérios de aceite:
- Area de prontuario aparece acima da timeline com bastante destaque.
- Nota clinica rapida fica separada e visualmente secundaria.
- Historico/timeline continua visivel.
- Salvamento invalida cache da pagina do paciente.

Testes:
- TypeScript.
- Criar registro de prontuario e nota clinica.
- Verificar aparicao na timeline apos refresh.

## 4. Sidebar direita do paciente

Problema reportado:
- Opcoes e atalhos na direita nao ficaram acessiveis.
- Minha primeira correcao ficou grande demais e ocupou a coluna direita.
- Precisa ser uma sidebar de fato, minimalista, retratil/expansivel.
- Nao pode remover cards existentes como metas, lembretes, graficos, contato e portal.

Referencias aplicadas:
- Carbon Right Panel para painel associado a acao, nao card gigante permanente.
- Carbon Side Rail para comportamento expandir/retrair em hover/focus.
- OpenMRS Patient Chart para manter widgets clinicos separados em vez de misturar tudo num painel unico.

Decisao revisada:
- Trocar `PatientClinicalSidebar` de card grande para rail compacto.
- Estado colapsado: icones essenciais com tooltip.
- Estado expandido: labels e grupos "Acoes", "Dados", "Portal".
- Expandir por click e tambem suportar hover/focus em desktop.
- Manter todos os cards antigos abaixo: metas, tags, planos, compras, proxima consulta, contato, portal, graficos, bem-estar.
- Remover duplicacao visual pesada de "Relatorios e Dados" ou transforma-la em bloco compacto se necessario.

Estado do codigo:
- Painel grande existe, mas precisa ser refatorado.
- Cards antigos ainda existem no DOM; a timeline foi o item acidentalmente escondido, nao os cards da direita.

Correcao aplicada:
- `PatientClinicalSidebar` foi refatorada para rail compacto/retratil.
- Estado colapsado mostra icones com tooltip; estado expandido mostra grupos de acoes/dados/exportacao.
- Expande por hover/focus e pode ser fixada aberta por botao.
- Cards antigos da coluna direita permanecem abaixo: metas/lembretes, tags, planos, compras, proxima consulta, contato, portal, graficos, bem-estar e relatorios antigos.

Critérios de aceite:
- A coluna direita nao deve ficar dominada pela sidebar.
- Sidebar deve ter modo compacto e expandido.
- Graficos, lembretes/metas e demais cards continuam visiveis.
- Links reais ficam habilitados; se algo nao tiver rota, fica disabled com tooltip "em desenvolvimento".

Testes:
- TypeScript.
- Visual desktop em `/dashboard/fabiola/pacientes/paulo-amorim-8tg4ppy3#anamneses`.
- Mobile: sidebar deve virar bloco/accordion sem quebrar largura.

## 5. Breadcrumb

Problema reportado:
- Setas ainda com baixo contraste.

Decisao:
- Aumentar icone, stroke e contraste.
- Usar fundo sutil para separador em vez de `text-border-neutral`.

Estado do codigo:
- `AppBreadcrumbs` agora usa bolha `bg-warm-beige` e `text-text-secondary`.

Critérios de aceite:
- Separador visivel no tema claro.
- Nao competir com o label atual.

Testes:
- Visual em paginas com breadcrumb.
- Checar contraste em tema claro e escuro.

## 6. Transcricao em tempo real na chamada nativa

Problema solicitado:
- Depois dos pontos principais, transcricao ao vivo para ligacao nativa.

Referencias aplicadas:
- MDN Web Speech API e SpeechRecognition: API de reconhecimento de fala tem suporte variavel e nao e Baseline.
- Por risco de suporte, a UX precisa explicar fallback para transcricao manual.

Decisao:
- Implementar como recurso progressivo para `NATIVE_WEBRTC`.
- Exigir consentimento explicito antes de iniciar.
- Mostrar texto parcial em tempo real.
- Salvar como transcricao manual vinculada ao atendimento.
- Nao prometer qualidade clinica; texto deve ser revisado no painel existente.

Estado do codigo:
- `LiveTranscriptionRecorder` criado e plugado em `CareSessionRoom` quando provider e nativo.
- TypeScript passou.
- Strings da UI foram movidas para `transcriptions.live` em PT/EN/ES.
- Salvamento para a captura antes de registrar a transcricao.

Pendencia antes de considerar pronto:
- Testar comportamento em navegador sem SpeechRecognition.
- Validar se a transcricao nao tenta ouvir quando a chamada nao foi iniciada.

## Ordem revisada de execucao

1. Corrigir timeline do prontuario escondida.
2. Refatorar `PatientClinicalSidebar` para rail compacto/retratil.
3. Revalidar tooltips/sino contra criterios de hover/focus e dados reais.
4. Revalidar tema e custom theme visualmente.
5. Revisar transcricao ao vivo com fallback e i18n.
6. Rodar testes: JSON parse, TypeScript, testes direcionados e build.
7. Atualizar documento final com resultado dos testes.

## Resultado da rodada 2026-07-05

Concluido:
- Tooltip em portal com tema, colisao basica e Escape.
- Sino com hover/focus, Escape, badge numerico, loading/erro/vazio e dados reais via `/api/dashboard/[tenant]/notifications`.
- Tema claro padrao corrigido para base azul escuro `#08284D` + bege `#D2AB85`; verde restrito a estados semanticos.
- Custom theme expandido para navbar/sidebar.
- Prontuario principal com textarea grande e nota clinica rapida separada.
- Timeline do prontuario restaurada depois do achado da autoauditoria.
- Sidebar direita do paciente refeita como rail compacto/retratil, mantendo cards antigos da coluna direita.
- Breadcrumb com separador mais visivel.
- Transcricao ao vivo para `NATIVE_WEBRTC` com consentimento, fallback para navegador sem suporte, i18n PT/EN/ES e salvamento como transcricao manual.

Validacoes executadas:
- `node` parse dos JSONs `pt/en/es`: passou.
- `npx tsc --noEmit --pretty false`: passou.
- `npm run test`: passou, 67 arquivos / 663 testes.
- `npm run build`: passou depois de parar processos antigos do `next dev` que travavam o `prisma generate`.
- `Invoke-WebRequest http://localhost:3000/dashboard/fabiola`: HTTP 200.
- `Invoke-WebRequest http://localhost:3000/dashboard/fabiola/pacientes/paulo-amorim-8tg4ppy3#anamneses`: HTTP 200.
- Dev server reiniciado em `http://localhost:3000`.

Validacoes com ressalva:
- `npm run lint`: ainda falha, mas os erros introduzidos nesta rodada foram corrigidos. Restam erros preexistentes em scripts CommonJS (`require`), `calculadoras/page.tsx` com `any`, e `PatientAIAssistantChat.tsx` com regras do React Compiler.
- Screenshot/Playwright: nao executado porque o projeto nao tem Playwright instalado e nao havia ferramenta browser/screenshot disponivel na sessao.

Riscos remanescentes:
- A Web Speech API/SpeechRecognition nao e Baseline e depende do navegador; por isso o recurso e progressivo e mantem fallback manual.
- A validacao visual final ainda deve ser feita no navegador em `localhost:3000`, principalmente hover/focus do sino e rail da sidebar.
