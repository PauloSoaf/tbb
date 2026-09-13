# Sprint Clínica — Oficina de Planos e Antropometria

Data: 2026-07-29

## Objetivo

Evoluir a Oficina de Planos para uma entrega visualmente configurável e tornar
a avaliação antropométrica capaz de registrar referências clínicas, razões
corporais e dobras cutâneas com cálculo reproduzível no servidor.

## Oficina de Planos

- O botão **Inserir imagem** envia o arquivo ao fluxo rastreado do plano e
  insere um nó de imagem no Tiptap. Com a imagem selecionada, a toolbar permite
  editar texto alternativo, largura e alinhamento, ou removê-la.
- O nó de refeição do Tiptap preserva imagem, texto alternativo, legenda e a
  preferência de exibição no PDF para a refeição e para cada alimento.
- A medida caseira do alimento pode ser editada no nó estruturado. Quando
  informada manualmente, sua origem é marcada como `MANUAL`; uma lista de
  medidas usuais (unidade, xícara, colheres, fatia, concha, porção e copo)
  acelera o preenchimento sem impedir texto livre.
- A barra lateral do Estúdio inclui estilo do PDF: logotipo, posição/tamanho,
  marca-d'água de texto ou imagem, opacidade, repetição, paginação, cabeçalho
  com data/paciente e modo de exibição das imagens. Sem um logotipo específico
  do plano, é usada a imagem de perfil da clínica como fallback.
- A prévia abre a rota de PDF do próprio plano. O paginador renderiza o número
  de página em cada folha gerada, em vez de depender de uma numeração visual
  fora da área capturada pela exportação.
- O PDF usa os campos estruturados de imagem, legenda e medida caseira; o
  modo selecionado pode mostrar todas as imagens, apenas as de refeições ou
  nenhuma.

### Upload e remoção de imagens

`/api/meal-plans/images` aceita somente JPEG, PNG e WebP. Além do MIME type,
o servidor confere a assinatura do arquivo. Antes de gravar ou remover, ele
confirma a permissão `mealPlans.edit`, o plano no tenant atual e, quando já
existir, a propriedade do alvo (refeição/alimento). Os arquivos são vinculados
ao `resourceId` do plano no ledger de armazenamento; a remoção não aceita uma
URL arbitrária. Auditoria registra apenas metadados operacionais, sem conteúdo
clínico ou binário.

## Persistência e migração

A migração [20260729070000_clinical_meal_plan_upgrade](../prisma/migrations/20260729070000_clinical_meal_plan_upgrade/migration.sql)
é aditiva e mantém planos e medições anteriores válidos.

| Entidade | Campos acrescentados |
| --- | --- |
| `MealPlan` | `pdfStyle` (JSON) |
| `Meal` | `imageAlt`, `imageCaption`, `showImageInPdf` |
| `MealItem` | `householdMeasureSource`, `imageUrl`, `imageAlt`, `imageCaption`, `showImageInPdf` |
| `PatientMeasurement` | perfil/snapshot demográfico, RCQ/rel. cintura-estatura e dados de dobras cutâneas |

O JSON de dobras é versionado (`{ version: 1, sites: ... }`) e preserva as
leituras brutas; os campos-resumo continuam consultáveis em relatórios e
gráficos. A migração também acrescenta o índice
`patient_measurements_nutritionistId_patientId_idx`.

## Avaliação antropométrica

### Perfis e classificações

- `ADULT`: IMC com faixas adultas.
- `ELDERLY`: IMC com a referência de Lipschitz (`<22`, `22–27`, `>27`).
- `CHILD`: o IMC numérico é calculado, mas não recebe classificação adulta.
  A classificação fica explicitamente pendente da curva OMS por idade e sexo.
  As tabelas/z-scores OMS não são distribuídos nesta sprint.

O perfil, a idade e o sexo biológico de referência ficam no registro da
medição. Assim, uma alteração posterior no cadastro do paciente não reescreve
a interpretação histórica.

Para uma nova avaliação, a data de nascimento sugere `CHILD` abaixo de 18
anos, `ADULT` entre 18 e 59 anos e `ELDERLY` a partir de 60 anos. A sugestão
nunca substitui a escolha manual da nutricionista e fica salva como snapshot
daquela avaliação.

As razões são recalculadas a partir da fonte: RCQ (`cintura/quadril`) e relação
cintura/estatura (`cintura em cm/altura em cm`). Para crianças ou sexo de
referência não informado, o sistema não inventa ponto de corte de risco.

### Dobras cutâneas

O painel permite até três leituras por ponto e calcula a média. Diferença
relativa maior que 5% entre leituras gera aviso para repetir a aferição. Estão
disponíveis:

- Jackson-Pollock 3 dobras (masculino e feminino) e 7 dobras;
- Durnin-Womersley 4 dobras;
- Slaughter para criança/adolescente;
- modo manual, que conserva a soma, sem estimar percentual de gordura.

As fórmulas compatíveis produzem densidade corporal e aplicam Siri para
percentual de gordura; Slaughter calcula o percentual diretamente. Idade, sexo,
perfil, pontos obrigatórios e faixa de referência são validados antes do
resultado ficar pronto. O percentual, a massa gorda e a massa magra submetidos
pela interface são recalculados no servidor a partir das medições de origem.

Essas estimativas apoiam a avaliação nutricional e não substituem julgamento
clínico, equipamento calibrado, treinamento de aferição ou diretrizes locais.

## Internacionalização

As chaves novas foram agrupadas em dois namespaces equivalentes em
`src/lib/i18n/pt.json`, `en.json` e `es.json`:

- `meal_plan_clinical`: imagens, medida caseira, estilo e paginação do PDF;
- `anthropometry_clinical`: perfis, avisos, pontos anatômicos, protocolos e
  leituras de dobras.

Isso mantém a interface em PT, EN e ES sem recorrer a texto de fallback para
os fluxos novos.

## Verificação manual recomendada

1. Criar/abrir um plano, adicionar imagem a uma refeição e a um alimento,
   preencher texto alternativo, legenda e medida caseira; salvar e reabrir.
2. Configurar logo, marca-d'água e paginação; abrir a prévia e confirmar que
   a exportação mostra a mesma configuração em todas as páginas aplicáveis.
3. Tentar enviar extensão ou conteúdo que não seja JPEG/PNG/WebP e confirmar
   bloqueio; tentar URL de outro plano na remoção e confirmar bloqueio.
4. Criar avaliações adulta, idosa e infantil; confirmar referências distintas
   e que criança não recebe classificação adulta.
5. Informar leituras triplicadas de dobras, verificar média, aviso de variação
   e recálculo após salvar/editar.

## Comandos de validação

```powershell
npx prisma generate
npx prisma migrate deploy
npx tsc --noEmit
npx eslint src/lib/anthropometry src/components/anthropometry src/components/meal-plan-studio src/app/api/meal-plans/images
npx vitest run src/lib/anthropometry/__tests__ src/lib/meal-plan/__tests__
npm run build
```

`migrate deploy` deve ser executado somente no ambiente de destino com a
`DATABASE_URL` correspondente e backup/rotina de deploy aprovados.

## Referências clínicas

- OMS — [BMI-for-age, 5–19 anos](https://www.who.int/toolkits/growth-reference-data-for-5to19-years/indicators/bmi-for-age): referência necessária para classificação pediátrica.
- Jackson AS, Pollock ML — equações de densidade corporal por dobras; [Durnin JVGA, Womersley J](https://pubmed.ncbi.nlm.nih.gov/4843734/) — equações de quatro dobras; Slaughter MH et al. — estimativas pediátricas. As fórmulas aplicadas e seus identificadores estão centralizados em `src/lib/anthropometry/skinfold.ts`.
