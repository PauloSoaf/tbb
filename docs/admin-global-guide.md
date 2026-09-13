# Guia de Operação — Super Administração Global do NutriOpus

Este documento é o guia de referência operacional para o proprietário do SaaS (**Global Admin**) acessar, monitorar e gerenciar a plataforma **NutriOpus** em nível global.

---

## 1. Como Acessar o Dashboard Global

A área administrativa global está protegida em uma camada separada das rotas de inquilinos (`/dashboard/[tenant]`).

### Endereço de Acesso
- **URL Direta**: `/admin`
- **Requisito de Segurança**: Apenas contas autenticadas cujo `Role` no banco de dados seja exatamente `GLOBAL_ADMIN` têm acesso. Qualquer outro usuário (mesmo `OWNER` de uma clínica) é redirecionado ou recebe erro `403 Access Denied`.

### Como Conceder a Permissão de `GLOBAL_ADMIN` a uma Conta
O script de inicialização (`prisma/seed-permissions.ts`) define automaticamente o usuário configurado na variável de ambiente `GLOBAL_ADMIN_EMAIL` como administrador root.

Para rodar o seed e garantir que seu e-mail tenha acesso root e que os planos estejam carregados:
```bash
npx tsx prisma/seed-permissions.ts
```
*Observação*: Por padrão, se a variável `GLOBAL_ADMIN_EMAIL` não for informada, o sistema busca a conta `pauloamorim70144@gmail.com`.

---

## 2. Visão Geral do Painel (`/admin`)

O painel principal oferece observabilidade em tempo real sobre a saúde e o crescimento da plataforma:

1. **KPIs Principais**:
   - **Receita MRR Estimada**: Cálculo em tempo real somando o valor mensal de todas as clínicas com assinatura ativa ou em período de teste.
   - **Clínicas / Tenants**: Contagem total de clínicas cadastradas no SaaS e indicador de novas clínicas criadas nos últimos 30 dias.
   - **Pacientes Ativos**: Número total de pacientes gerenciados em toda a base de inquilinos.
   - **Membros de Equipe**: Total de usuários colaboradores ativos (nutricionistas, secretárias e assistentes).

2. **Distribuição de Planos**:
   - Gráfico de barras demonstrando o percentual de adoção de cada plano de monetização (`FREE`, `BASIC`, `PRO`, `CLINIC`).

3. **Atividade & Produção Clínica**:
   - Volume total de consultas realizadas, anamneses respondidas e avaliações antropométricas registradas na plataforma.

---

## 3. Gestão de Clínicas & Alteração de Planos (`/admin/tenants`)

Nesta aba, você tem controle total sobre todos os inquilinos (clínicas) cadastrados no NutriOpus.

### Recursos Disponíveis:
- **Busca Global Rápida**: Pesquise instantaneamente por nome do nutricionista, slug da clínica (ex: `/clínica-sp`), e-mail ou número de CRN.
- **Filtro por Plano**: Filtre apenas inquilinos no plano Gratuito, Starter, Profissional ou Clínica.
- **Auditoria de Capacidade**: Veja quantos pacientes e membros da equipe cada clínica possui atualmente.
- **Ação Rápida de Upgrade/Downgrade de Plano**:
  - Na coluna **Alterar Plano (Ação Rápida)**, você pode mudar instantaneamente a assinatura da clínica através de um seletor suspenso (`FREE` ➔ `BASIC` ➔ `PRO` ➔ `CLINIC`).
  - A alteração tem efeito em tempo real nas permissões de governança (`requirePermission`) e nos limites do inquilino.
  - **Trilha de Auditoria**: Toda mudança de plano feita no painel `/admin` gera um registro imutável no log de auditoria sob a ação `globalAdmin.plan.update`.

---

## 4. Catálogo e Configuração de Planos (`/admin/planos`)

A aba `/admin/planos` exibe o catálogo estruturado de assinaturas do produto e os limites e funcionalidades liberados em cada nível:

| Plano | Código | Valor / Mês | Limite de Pacientes | Limite de Equipe | Recursos Especiais |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NutriOpus Gratuito** | `FREE` | R$ 0,00 | 5 | 1 | Prontuário básico e Oficina de Planos |
| **NutriOpus Starter** | `BASIC` | R$ 97,00 | 30 | 1 | Agenda avançada e Teleatendimento |
| **NutriOpus Profissional** | `PRO` | R$ 197,00 | 150 | 3 | **Trilha de Auditoria e Overrides RBAC** |
| **NutriOpus Clínica & Equipe** | `CLINIC` | R$ 397,00 | Ilimitado | 15 | **Governança Total & Multi-colaborador** |

---

## 5. Auditoria Cross-Tenant (`/admin/auditoria`)

O **Monitor de Auditoria Geral** é a ferramenta de segurança máxima do proprietário da plataforma. Ele consolida os eventos de segurança de todos os inquilinos em uma única tela.

- **O que monitorar**: Tentativas de login falhas (`session.login.failed`), acessos negados por falta de permissão (`permission.denied`), revogações de sessões remotas (`session.revoke`) e exclusões de pacientes via LGPD (`patient.delete`).
- **Sanitização de PII / Sigilo Médico**: Em conformidade estrita com o Art. 11 da LGPD e a ética do CFN, o Global Admin **não visualiza** notas clínicas, dietas ou diagnósticos dos pacientes nas linhas de auditoria — apenas metadados operacionais de governança (quem acessou o quê, quando e se foi permitido).

---

## 6. Central de Privacidade & Conformidade LGPD (Visão da Clínica)

Além do Dashboard Global `/admin`, cada clínica possui agora sua própria central em:
`/dashboard/[tenant]/configuracoes/privacidade`

Esta central permite que a própria clínica atenda às obrigações da Lei Geral de Proteção de Dados:
1. **Gestão de Consentimentos (Art. 7º)**: Registro com snapshot de versão e texto exato de aceite dos termos de privacidade e envio de mensagens via WhatsApp.
2. **Portabilidade (Art. 18 - Exportar JSON)**: Download em 1 clique de um pacote estruturado JSON contendo todo o histórico clínico do paciente.
3. **Direito ao Esquecimento / Pseudonimização (Art. 18)**: Opção de exclusão irreversível de identificadores diretos (nome, CPF, e-mail, telefone), substituindo-os por um hash anônimo para preservar a integridade das métricas estatísticas da clínica sem violar o direito do titular.
