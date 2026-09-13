# Sprint 2 — NutriOpus: MVP Usável

**Data de início:** Junho 2026  
**Branch:** `feature/supabase-integration`  
**Status:** ✅ Concluída

---

## Objetivo

Tornar o NutriOpus usável para uma nutricionista real, consolidando todas as features de gestão de pacientes, agenda e configurações implementadas nas duas primeiras sprints, e corrigindo bugs estruturais identificados na análise do código.

---

## Pré-condição de entrega

Antes de qualquer implementação, os seguintes checks foram executados e **passaram**:

| Comando | Resultado |
|---------|-----------|
| `git status` | ✅ Limpo |
| `npm run lint` | ✅ Zero erros |
| `npm run build` | ✅ Sucesso (16 rotas) |
| `npm run test` | ✅ 66 testes passando (7 suítes) |

---

## Features implementadas nesta sprint

### 1. Botão "Novo Paciente" na listagem
- Adicionado à `pacientes/page.tsx` ao lado da busca
- Responsivo: `flex-col` no mobile, `flex-row` no desktop
- Empty state melhorado com CTA de cadastro quando lista está vazia
- Corrigido bug visual: tabela desktop e cards mobile não se sobrepõem mais (`hidden md:block`)

**Arquivo:** `src/app/dashboard/[tenant]/pacientes/page.tsx`

---

### 2. Arquivar paciente com confirmação
- Novo componente `ArchivePatientButton.tsx` (client component)
- Fluxo de 2 etapas: botão → confirmação com nome do paciente → executar
- Badge de status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) exibido no detalhe
- Só exibe o botão Arquivar quando status é `ACTIVE`

**Arquivos:**
- `src/components/patients/ArchivePatientButton.tsx` [NOVO]
- `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx`

---

### 3. Correção: birthDate na edição de paciente
- `toISOString()` retornava `"2000-01-15T00:00:00.000Z"` — incompatível com input `type="date"`
- Corrigido para `.toISOString().slice(0, 10)` → `"2000-01-15"`

**Arquivo:** `src/app/dashboard/[tenant]/pacientes/[patientId]/editar/page.tsx`

---

### 4. Correção crítica: Página de impressão da anamnese
**Bug:** A página `/imprimir` era um Server Component mas usava `onClick` em `<button>` e um `<script dangerouslySetInnerHTML>` com selector quebrado (`[onClick]` não funciona no DOM).

**Solução:** Criado `PrintActions.tsx` como `"use client"` que expõe:
- Botão "Imprimir" com `window.print()`
- Link "Voltar" com ícone

**Arquivos:**
- `src/components/dashboard/PrintActions.tsx` [NOVO]
- `src/app/dashboard/[tenant]/anamnese/[responseId]/imprimir/page.tsx`

---

### 5. Dashboard — 5º card de stats
- Adicionado `ShieldAlert` card "Pontos de atenção" com cor `rose`
- Grid ajustado: `2 cols / 3 cols (md) / 5 cols (xl)`

**Arquivo:** `src/app/dashboard/[tenant]/page.tsx`

---

### 6. StatsCard melhorado
- Borda esquerda colorida (4px) por variante de cor
- Micro-animação hover: `hover:-translate-y-0.5 hover:shadow-md`
- Nova variante `rose` adicionada
- Texto do título em uppercase tracking-wide para estilo clínico

**Arquivo:** `src/components/dashboard/StatsCard.tsx`

---

### 7. AnamneseSummaryCard melhorado
- Borda esquerda colorida por status (azul=nova, verde=revisada, cinza=arquivada)
- Mesmo padrão visual do StatsCard para consistência
- Data formatada como `"dd/MM/yyyy às HH:mm"` (mais compacta)
- `truncate` no nome do paciente para evitar overflow

**Arquivo:** `src/components/dashboard/AnamneseSummaryCard.tsx`

---

### 8. Testes novos (2 suítes)
- `appointment.schema.test.ts` — 12 testes
- `nutritionist.schema.test.ts` — 14 testes

**Total final:** 92 testes, 9 suítes  
**Arquivo:** `src/validation/__tests__/`

---

### 9. Documentação
- `README.md` atualizado com Sprint 2
- `docs/SPRINT_2.md` criado (este arquivo)

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/components/patients/ArchivePatientButton.tsx` | Botão de arquivar com confirmação (client component) |
| `src/components/dashboard/PrintActions.tsx` | Botões de impressão (client component, fix de bug) |
| `src/validation/__tests__/appointment.schema.test.ts` | 12 testes do schema de consulta |
| `src/validation/__tests__/nutritionist.schema.test.ts` | 14 testes do schema da nutricionista |

## Arquivos modificados

| Arquivo | O que mudou |
|---------|-------------|
| `src/app/dashboard/[tenant]/pacientes/page.tsx` | Botão Novo Paciente, empty state, separação mobile/desktop |
| `src/app/dashboard/[tenant]/pacientes/[patientId]/page.tsx` | Badge de status, botão Arquivar, data de nascimento formatada |
| `src/app/dashboard/[tenant]/pacientes/[patientId]/editar/page.tsx` | Correção do formato de `birthDate` |
| `src/app/dashboard/[tenant]/page.tsx` | 5º card stats, grid responsivo ajustado |
| `src/app/dashboard/[tenant]/anamnese/[responseId]/imprimir/page.tsx` | Substituiu button/script por PrintActions |
| `src/components/dashboard/StatsCard.tsx` | Borda colorida, hover animation, variante rose |
| `src/components/dashboard/AnamneseSummaryCard.tsx` | Borda por status, micro-animation, tipografia |
| `README.md` | Atualizado com Sprint 2 |

---

## Regras de negócio importantes

1. **Multi-tenancy estrito**: toda query filtra por `nutritionistId` via `assertTenantAccess()`
2. **Arquivar paciente** usa `archivePatientAction` → `archivePatient()` no service → apenas status para `ARCHIVED`
3. **Página de impressão** protegida por tenant antes de renderizar
4. **Server Actions** verificam sessão E tenant antes de qualquer operação de escrita
5. **Payload da anamnese** serializado com `JSON.parse(JSON.stringify(...))` para remover `undefined`

---

## Critérios de aceite verificados

- [x] `npm run lint` passa sem erros
- [x] `npm run build` gera 16 rotas sem erro
- [x] `npm run test` 92 testes passando
- [x] Botão "Novo Paciente" visível na listagem
- [x] Arquivar paciente com confirmação funciona
- [x] Campo de data de nascimento pré-preenchido corretamente na edição
- [x] Botão "Imprimir" na página de impressão chama `window.print()`
- [x] Dashboard exibe 5 cards de stats
- [x] Pacientes de tenants diferentes não se cruzam
- [x] Rotas existentes continuam funcionando

---

## Pendências / próxima sprint

1. **Upload de foto de perfil real** (atualmente apenas URL manual)
2. **Visão mensal da agenda** (calendário visual)
3. **PDF gerado no servidor** via `@react-pdf/renderer`
4. **Notificações** de nova anamnese (email ou WhatsApp)
5. **Segundo seed** para testar multi-tenant real
6. **Busca da agenda** por paciente ou data específica
7. **Histórico de medições** do paciente (gráfico de peso/IMC)
